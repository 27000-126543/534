import type { Plugin } from 'vite';
import {
  mockUsers,
  mockPatients,
  createMockTask,
  generateTaskList,
  generateAuthResponse,
  parseMockToken,
  mockAnalytics,
  mockHeadModel,
  mockForwardResult,
  mockSourceResult,
  mockTargetPlan,
  getValidTransitions
} from './data';
import { TaskStatus, ApprovalStatus, RoleCode } from '../../shared/types/enums';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

interface MockTaskStore {
  [taskId: string]: ReturnType<typeof createMockTask>;
}

const taskStore: MockTaskStore = {};

function initDefaultTasks() {
  if (Object.keys(taskStore).length === 0) {
    const t1 = createMockTask(TaskStatus.TARGET_EVALUATING, 100);
    t1.id = 'task_1';
    t1.taskNo = 'TSK-2024015';
    taskStore[t1.id] = t1;

    const t2 = createMockTask(TaskStatus.SOURCE_INVERTING, 65);
    t2.id = 'task_2';
    t2.taskNo = 'TSK-2024016';
    taskStore[t2.id] = t2;

    const t3 = createMockTask(TaskStatus.PENDING_ENGINEER_APPROVAL, 100);
    t3.id = 'task_3';
    t3.taskNo = 'TSK-2024017';
    taskStore[t3.id] = t3;

    const t4 = createMockTask(TaskStatus.PENDING_DIRECTOR_APPROVAL, 100);
    t4.id = 'task_4';
    t4.taskNo = 'TSK-2024018';
    taskStore[t4.id] = t4;

    const t5 = createMockTask(TaskStatus.COMPLETED, 100);
    t5.id = 'task_5';
    t5.taskNo = 'TSK-2024014';
    taskStore[t5.id] = t5;
  }
}

initDefaultTasks();

function sendJson(res: any, data: any, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function sendPdf(res: any, pdfBytes: Uint8Array, filename: string) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(Buffer.from(pdfBytes));
}

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function parseQuery(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const qIdx = url.indexOf('?');
  if (qIdx > -1) {
    const qs = url.slice(qIdx + 1);
    qs.split('&').forEach((p) => {
      const [k, v] = p.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  return params;
}

function authUser(req: any): { id: string; roleCode: RoleCode; user: any } | null {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  const parsed = parseMockToken(token);
  if (!parsed) return null;
  const userEntry = Object.values(mockUsers).find((u) => u.user.id === parsed.id);
  if (!userEntry) return null;
  return { ...parsed, user: userEntry.user };
}

async function generateReportPdf(task: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - 50;

  const drawText = (text: string, opts: any = {}) => {
    const font = opts.bold ? helveticaBoldFont : helveticaFont;
    const size = opts.size || 11;
    const color = opts.color || rgb(0, 0, 0);
    page.drawText(text, {
      x: opts.x || 50,
      y,
      size,
      font,
      color
    });
    if (opts.newline !== false) {
      y -= (opts.lineHeight || size + 4);
    }
    if (y < 60) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
  };

  const drawSeparator = () => {
    page.drawLine({
      start: { x: 50, y: y + 2 },
      end: { x: width - 50, y: y + 2 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7)
    });
    y -= 12;
  };

  drawText('NEUROGUIDE 脑电源定位与TMS靶点优化综合报告', { bold: true, size: 18, color: rgb(0.1, 0.25, 0.6), lineHeight: 28 });
  drawText(`任务编号: ${task.taskNo}`, { size: 10, color: rgb(0.4, 0.4, 0.4), lineHeight: 16 });
  drawText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, { size: 10, color: rgb(0.4, 0.4, 0.4), lineHeight: 24 });
  drawSeparator();

  drawText('一、患者与任务基本信息', { bold: true, size: 14, color: rgb(0.1, 0.25, 0.6), lineHeight: 24 });
  drawText(`患者姓名: ${task.patient.name}`);
  drawText(`病历号: ${task.patient.medicalRecordNo}`);
  drawText(`性别/年龄: ${task.patient.gender} / ${task.patient.age}岁`);
  drawText(`临床诊断: ${task.patient.diagnosis}`);
  drawText(`任务名称: ${task.taskName}`);
  drawText(`算法类型: ${task.algorithmTypeText}`);
  drawText(`目标脑区: ${task.targetBrainRegionText || '未指定'}`);
  y -= 8;
  drawSeparator();

  if (task.sourceResult) {
    const sr = task.sourceResult;
    drawText('二、皮层电流密度分布分析', { bold: true, size: 14, color: rgb(0.1, 0.25, 0.6), lineHeight: 24 });
    drawText(`偶极子位置 (MNI坐标 mm): X=${sr.dipoleParameters.position[0].toFixed(2)}, Y=${sr.dipoleParameters.position[1].toFixed(2)}, Z=${sr.dipoleParameters.position[2].toFixed(2)}`);
    drawText(`偶极子矩向量: (${sr.dipoleParameters.moment.map((v: number) => v.toFixed(3)).join(', ')})`);
    drawText(`拟合优度 (GOF): ${(sr.dipoleParameters.goodnessOfFit * 100).toFixed(1)}%`);
    drawText(`平均残差误差: ${sr.meanResidual.toFixed(2)}%  (阈值: 10%)`);
    drawText(`源空间定位精度: ${sr.sourceSpatialAccuracy.toFixed(2)} mm`);
    drawText(`正则化参数 (lambda): ${sr.regularizationParam}`);
    y -= 6;
    drawText('[注] 皮层电流密度三维分布图见系统3D可视化模块，最大激活簇位于左侧背外侧前额叶(DLPFC)。', {
      size: 9, color: rgb(0.4, 0.4, 0.4), lineHeight: 14
    });
    y -= 8;
    drawSeparator();

    drawText('三、源活动时序分析', { bold: true, size: 14, color: rgb(0.1, 0.25, 0.6), lineHeight: 24 });
    drawText(`数据采样率: ${sr.sourceTimeSeries.samplingRate} Hz`);
    drawText(`信号单位: ${sr.sourceTimeSeries.unit}`);
    drawText(`分析时间窗: ${task.algorithmParams.timeWindow}ms (重叠率 ${task.algorithmParams.overlap}%)`);
    drawText(`频段分解: Delta(1-4Hz) / Theta(4-8Hz) / Alpha(8-13Hz) / Beta(13-30Hz) / Gamma(30-100Hz)`);
    drawText(`异常时间窗数量: ${sr.monitoringMetrics.filter((m: any) => m.isAlertTriggered).length} / ${sr.monitoringMetrics.length}`);
    y -= 6;
    drawText('[注] 源活动时序曲线和频率谱分析图见系统图表模块。', {
      size: 9, color: rgb(0.4, 0.4, 0.4), lineHeight: 14
    });
    y -= 8;
    drawSeparator();

    drawText('四、偶极子置信椭圆', { bold: true, size: 14, color: rgb(0.1, 0.25, 0.6), lineHeight: 24 });
    const ce = sr.confidenceEllipsoid;
    drawText(`置信度水平: ${(ce.confidenceLevel * 100).toFixed(0)}%`);
    drawText(`椭球中心: (${ce.center.map((v: number) => v.toFixed(2)).join(', ')}) mm`);
    drawText(`半轴长度: X=${ce.radii[0].toFixed(2)}, Y=${ce.radii[1].toFixed(2)}, Z=${ce.radii[2].toFixed(2)} mm`);
    drawText(`体积估算: ${((4 / 3) * Math.PI * ce.radii[0] * ce.radii[1] * ce.radii[2]).toFixed(2)} mm³`);
    y -= 6;
    drawText('[注] 置信椭圆2D投影图见系统置信椭圆分析模块。', {
      size: 9, color: rgb(0.4, 0.4, 0.4), lineHeight: 14
    });
    y -= 8;
    drawSeparator();
  }

  if (task.targetPlan) {
    const tp = task.targetPlan;
    drawText('五、TMS线圈放置角度与刺激方案', { bold: true, size: 14, color: rgb(0.1, 0.25, 0.6), lineHeight: 24 });
    drawText(`刺激靶点坐标 (MNI mm): (${tp.coilPosition.map((v: number) => v.toFixed(2)).join(', ')})`, { size: 11 });
    drawText(`线圈放置角度: ${tp.coilOrientation.angleDegrees.toFixed(1)}° (相对前后连合线AC-PC)`, { size: 11 });
    drawText(`线圈法向量: (${tp.coilOrientation.normal.map((v: number) => v.toFixed(3)).join(', ')})`, { size: 11 });
    drawText(`手柄方向向量: (${tp.coilOrientation.handleDirection.map((v: number) => v.toFixed(3)).join(', ')})`, { size: 11 });
    drawText(`刺激电流强度: ${tp.currentIntensity.toFixed(2)} A/m²`, { size: 11 });
    drawText(`刺激模式: ${tp.pulsePatternText}`, { size: 11 });
    drawText(`脉冲总数: ${tp.pulseCount}`, { size: 11 });
    drawText(`刺激体积: ${tp.stimulationVolume.toFixed(2)} cm³`, { size: 11 });
    y -= 4;
    drawText('┌─────────────────────────────────────────────────────────┐', { size: 9, color: rgb(0.2, 0.5, 0.9), lineHeight: 13 });
    drawText(`│ 聚焦指数 (Focality): ${(tp.focalityIndex * 100).toFixed(1)}%    靶区覆盖率 (Coverage): ${(tp.targetCoverage * 100).toFixed(1)}%  │`, { size: 9, color: rgb(0.2, 0.5, 0.9), lineHeight: 13 });
    drawText('└─────────────────────────────────────────────────────────┘', { size: 9, color: rgb(0.2, 0.5, 0.9), lineHeight: 20 });

    if (tp.isAIRecommended && tp.aiRecommendationParams) {
      drawText(`AI推荐置信度: ${(tp.aiRecommendationParams.confidence * 100).toFixed(0)}%   历史相似度: ${(tp.aiRecommendationParams.historicalSimilarity * 100).toFixed(0)}%`, { size: 10, color: rgb(0.2, 0.5, 0.9), lineHeight: 16 });
    }
    y -= 8;

    if (tp.alternativePlans && tp.alternativePlans.length > 0) {
      drawText('备选刺激方案:', { bold: true, size: 11, lineHeight: 16 });
      tp.alternativePlans.forEach((alt: any, i: number) => {
        drawText(`  方案${i + 1}: 位置(${alt.coilPosition.map((v: number) => v.toFixed(1)).join(',')})  角度${alt.angleDegrees.toFixed(0)}°  强度${alt.currentIntensity.toFixed(2)}A/m²`, { size: 9, lineHeight: 13 });
        drawText(`          聚焦${(alt.focalityIndex * 100).toFixed(0)}%  覆盖${(alt.targetCoverage * 100).toFixed(0)}%  权衡: ${alt.tradeOffReason}`, { size: 9, lineHeight: 16 });
      });
    }
    y -= 6;
    drawSeparator();
  }

  drawText('六、审批流程记录', { bold: true, size: 14, color: rgb(0.1, 0.25, 0.6), lineHeight: 24 });
  task.approvals.forEach((app: any) => {
    const statusText = app.status === ApprovalStatus.APPROVED ? '已通过' : app.status === ApprovalStatus.REJECTED ? '已驳回' : '待审批';
    drawText(`${app.approvalLevelText}: ${statusText}`, { size: 11, lineHeight: 16 });
    if (app.approver) drawText(`  审批人: ${app.approver.fullName} (${app.approver.title})`, { size: 10, lineHeight: 14 });
    if (app.comment) drawText(`  审批意见: ${app.comment}`, { size: 10, lineHeight: 18 });
    if (app.approvedAt) drawText(`  审批时间: ${new Date(app.approvedAt).toLocaleString('zh-CN')}`, { size: 10, lineHeight: 18 });
  });
  y -= 10;

  drawText('──────────────────────────────────────────────────────', {
    size: 10, color: rgb(0.6, 0.6, 0.6), lineHeight: 14
  });
  drawText('本报告由 NeuroGuide 脑电源定位平台自动生成，仅供临床研究参考。', {
    size: 9, color: rgb(0.5, 0.5, 0.5), lineHeight: 14
  });
  drawText('© 2024 NeuroGuide Platform · Clinical Research Edition', {
    size: 9, color: rgb(0.5, 0.5, 0.5), lineHeight: 14
  });

  return await pdfDoc.save();
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        const url = req.url;
        const method = (req.method || 'GET').toUpperCase();
        const query = parseQuery(url);
        const pathWithoutQuery = url.split('?')[0];

        try {
          // ============ AUTH: /api/auth/* ============
          if (pathWithoutQuery.startsWith('/api/auth')) {
            if (pathWithoutQuery === '/api/auth/login' && method === 'POST') {
              const body = await readBody(req);
              const entry = mockUsers[body.username];
              if (!entry || entry.password !== body.password) {
                return sendJson(res, { success: false, message: '用户名或密码错误，请检查后重试' }, 401);
              }
              return sendJson(res, generateAuthResponse(entry.user));
            }

            if (pathWithoutQuery === '/api/auth/register' && method === 'POST') {
              const body = await readBody(req);
              if (!body.username || !body.password || !body.fullName) {
                return sendJson(res, { success: false, message: '用户名、密码和姓名不能为空' }, 400);
              }
              if (mockUsers[body.username]) {
                return sendJson(res, { success: false, message: '该用户名已存在' }, 400);
              }
              const newUser = {
                id: 'u_' + Date.now(),
                username: body.username,
                fullName: body.fullName,
                title: body.title || '临床工程师',
                roleCode: body.roleCode || RoleCode.ENGINEER,
                roleName: body.roleCode === RoleCode.ADMIN ? '系统管理员' : body.roleCode === RoleCode.DIRECTOR ? '神经内科主任' : body.roleCode === RoleCode.EXPERT ? '神经电生理专家' : body.roleCode === RoleCode.CHIEF_SCIENTIST ? '首席科学家' : body.roleCode === RoleCode.TECHNICIAN ? '实验室技术员' : '临床工程师'
              };
              mockUsers[body.username] = { password: body.password, user: newUser };
              return sendJson(res, generateAuthResponse(newUser));
            }

            if (pathWithoutQuery === '/api/auth/logout' && method === 'POST') {
              return sendJson(res, { success: true, message: '已成功退出登录' });
            }

            if (pathWithoutQuery === '/api/auth/me' && method === 'GET') {
              const auth = authUser(req);
              if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);
              return sendJson(res, auth.user);
            }
          }

          // ============ TASKS: /api/tasks/* ============
          if (pathWithoutQuery.startsWith('/api/tasks')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            if (pathWithoutQuery === '/api/tasks' && method === 'GET') {
              return sendJson(res, generateTaskList(15));
            }

            if (pathWithoutQuery === '/api/tasks' && method === 'POST') {
              const body = await readBody(req);
              const newTask = createMockTask(TaskStatus.PENDING_VALIDATION, 5);
              newTask.createdBy = auth.user;
              if (body.taskName) newTask.taskName = body.taskName;
              if (body.algorithmType) {
                newTask.algorithmType = body.algorithmType;
                newTask.algorithmTypeText = body.algorithmType.toUpperCase();
              }
              taskStore[newTask.id] = newTask;
              return sendJson(res, { id: newTask.id, ...newTask });
            }

            const taskMatch = pathWithoutQuery.match(/^\/api\/tasks\/([^/]+)$/);
            if (taskMatch) {
              const taskId = taskMatch[1];
              if (method === 'GET') {
                const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
                return sendJson(res, task);
              }
              if (method === 'PUT') {
                const body = await readBody(req);
                const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
                taskStore[taskId] = { ...task, ...body, updatedAt: new Date().toISOString() };
                return sendJson(res, taskStore[taskId]);
              }
            }
          }

          // ============ WORKFLOW: /api/workflow/* ============
          if (pathWithoutQuery.startsWith('/api/workflow')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            const transitionsMatch = pathWithoutQuery.match(/^\/api\/workflow\/transitions\/([^/]+)$/);
            if (transitionsMatch && method === 'GET') {
              const taskId = transitionsMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              const validTransitions = getValidTransitions(task.status, auth.roleCode as RoleCode);
              return sendJson(res, {
                success: true,
                currentStatus: task.status,
                validTransitions
              });
            }

            const transitionMatch = pathWithoutQuery.match(/^\/api\/workflow\/transition\/([^/]+)$/);
            if (transitionMatch && method === 'POST') {
              const taskId = transitionMatch[1];
              const body = await readBody(req);
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              const valid = getValidTransitions(task.status, auth.roleCode as RoleCode);
              const targetTransition = valid.find((t: any) => t.targetStatus === body.targetStatus);
              if (!targetTransition) {
                return sendJson(res, { success: false, error: '无权执行此状态转换或转换无效' }, 400);
              }
              task.status = body.targetStatus as TaskStatus;
              task.timeline.push({
                id: 't_' + Date.now(),
                fromStatus: task.status,
                toStatus: body.targetStatus,
                toStatusText: targetTransition.label,
                reason: body.comment || '状态转换',
                operator: auth.user,
                createdAt: new Date().toISOString()
              });
              if (body.targetStatus === TaskStatus.HEAD_MODEL_BUILDING) task.progress = 25;
              if (body.targetStatus === TaskStatus.FORWARD_COMPUTING) task.progress = 50;
              if (body.targetStatus === TaskStatus.SOURCE_INVERTING) task.progress = 75;
              if (body.targetStatus === TaskStatus.TARGET_EVALUATING) {
                task.progress = 100;
                task.sourceResult = mockSourceResult;
                task.targetPlan = mockTargetPlan;
              }
              taskStore[taskId] = task;
              return sendJson(res, { success: true, task, transition: targetTransition });
            }

            const autoAdvanceMatch = pathWithoutQuery.match(/^\/api\/workflow\/auto-advance\/([^/]+)$/);
            if (autoAdvanceMatch && method === 'POST') {
              const taskId = autoAdvanceMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.SOURCE_INVERTING, 65);
              const advanceMap: Record<string, TaskStatus> = {
                [TaskStatus.PENDING_VALIDATION]: TaskStatus.HEAD_MODEL_BUILDING,
                [TaskStatus.HEAD_MODEL_BUILDING]: TaskStatus.FORWARD_COMPUTING,
                [TaskStatus.FORWARD_COMPUTING]: TaskStatus.SOURCE_INVERTING,
                [TaskStatus.SOURCE_INVERTING]: TaskStatus.TARGET_EVALUATING
              };
              const next = advanceMap[task.status];
              if (next) {
                task.status = next;
                task.progress = Math.min(100, task.progress + 25);
                if (next === TaskStatus.TARGET_EVALUATING) {
                  task.progress = 100;
                  task.targetPlan = mockTargetPlan;
                }
                taskStore[taskId] = task;
              }
              return sendJson(res, { success: true, task });
            }

            const historyMatch = pathWithoutQuery.match(/^\/api\/workflow\/history\/([^/]+)$/);
            if (historyMatch && method === 'GET') {
              const taskId = historyMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              return sendJson(res, { success: true, history: task.timeline, progress: task.progress });
            }

            const progressMatch = pathWithoutQuery.match(/^\/api\/workflow\/progress\/([^/]+)$/);
            if (progressMatch && method === 'GET') {
              const taskId = progressMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              return sendJson(res, { success: true, progress: task.progress });
            }
          }

          // ============ COMPUTE: /api/compute/* ============
          if (pathWithoutQuery.startsWith('/api/compute')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            const hmMatch = pathWithoutQuery.match(/^\/api\/compute\/head-model\/build\/([^/]+)$/);
            if (hmMatch && method === 'POST') {
              const taskId = hmMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.HEAD_MODEL_BUILDING, 25);
              task.headModel = mockHeadModel;
              task.status = TaskStatus.HEAD_MODEL_BUILDING;
              task.progress = 25;
              taskStore[taskId] = task;
              return sendJson(res, mockHeadModel);
            }
            const hmGetMatch = pathWithoutQuery.match(/^\/api\/compute\/head-model\/([^/]+)$/);
            if (hmGetMatch && method === 'GET') {
              return sendJson(res, mockHeadModel);
            }

            const fwMatch = pathWithoutQuery.match(/^\/api\/compute\/forward\/solve\/([^/]+)$/);
            if (fwMatch && method === 'POST') {
              const taskId = fwMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.FORWARD_COMPUTING, 50);
              task.forwardResult = mockForwardResult;
              task.status = TaskStatus.FORWARD_COMPUTING;
              task.progress = 50;
              taskStore[taskId] = task;
              return sendJson(res, mockForwardResult);
            }
            const fwGetMatch = pathWithoutQuery.match(/^\/api\/compute\/forward\/([^/]+)$/);
            if (fwGetMatch && method === 'GET') {
              return sendJson(res, mockForwardResult);
            }

            const srcMatch = pathWithoutQuery.match(/^\/api\/compute\/source\/solve\/([^/]+)$/);
            if (srcMatch && method === 'POST') {
              const taskId = srcMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.SOURCE_INVERTING, 75);
              task.sourceResult = mockSourceResult;
              task.status = TaskStatus.SOURCE_INVERTING;
              task.progress = 75;
              taskStore[taskId] = task;
              return sendJson(res, mockSourceResult);
            }
            const srcGetMatch = pathWithoutQuery.match(/^\/api\/compute\/source\/([^/]+)$/);
            if (srcGetMatch && method === 'GET') {
              return sendJson(res, mockSourceResult);
            }

            const tgtMatch = pathWithoutQuery.match(/^\/api\/compute\/target\/optimize\/([^/]+)$/);
            if (tgtMatch && method === 'POST') {
              const taskId = tgtMatch[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              task.targetPlan = mockTargetPlan;
              task.status = TaskStatus.TARGET_EVALUATING;
              task.progress = 100;
              taskStore[taskId] = task;
              return sendJson(res, mockTargetPlan);
            }
            const tgtGetMatch = pathWithoutQuery.match(/^\/api\/compute\/target\/([^/]+)$/);
            if (tgtGetMatch && method === 'GET') {
              return sendJson(res, mockTargetPlan);
            }

            if (pathWithoutQuery === '/api/compute/target/coils' && method === 'GET') {
              return sendJson(res, [
                { id: 'figure8', name: '8字线圈', description: '标准聚焦线圈', focality: 0.9 },
                { id: 'circular', name: '圆形线圈', description: '大范围刺激', focality: 0.5 },
                { id: 'hcoil', name: 'H线圈', description: '深部脑区刺激', focality: 0.6 }
              ]);
            }
            if (pathWithoutQuery === '/api/compute/target/recommend' && method === 'POST') {
              return sendJson(res, { success: true, recommendation: mockTargetPlan });
            }
          }

          // ============ APPROVALS: /api/approvals/* ============
          if (pathWithoutQuery.startsWith('/api/approvals')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            if (pathWithoutQuery === '/api/approvals' && method === 'GET') {
              const approvalsList: any[] = [];
              Object.values(taskStore).forEach((t) => {
                t.approvals.forEach((a) => {
                  approvalsList.push({ ...a, taskNo: t.taskNo, patientName: t.patient.name });
                });
              });
              return sendJson(res, {
                data: approvalsList,
                total: approvalsList.length,
                page: 1,
                pageSize: 20,
                totalPages: 1
              });
            }

            if (pathWithoutQuery === '/api/approvals/submit' && method === 'POST') {
              const body = await readBody(req);
              const task = taskStore[body.taskId] || createMockTask(TaskStatus.PENDING_ENGINEER_APPROVAL, 100);
              task.status = body.type === 'engineer' ? TaskStatus.PENDING_ENGINEER_APPROVAL : TaskStatus.PENDING_DIRECTOR_APPROVAL;
              taskStore[task.id] = task;
              return sendJson(res, { success: true, message: '已提交审批' });
            }

            const procMatch = pathWithoutQuery.match(/^\/api\/approvals\/([^/]+)\/process$/);
            if (procMatch && method === 'POST') {
              const approvalId = procMatch[1];
              const body = await readBody(req);
              // 兼容两种字段名: decision/approved, comments/comment
              const approved = body.decision === 'approved' || body.decision === true || body.approved === true;
              const comment = body.comments || body.comment || '';

              let foundTask: any = null;
              let foundApproval: any = null;
              Object.values(taskStore).forEach((t) => {
                const app = t.approvals.find((a: any) => a.id === approvalId);
                if (app) {
                  foundTask = t;
                  foundApproval = app;
                }
              });

              if (!foundApproval) {
                return sendJson(res, { success: false, error: '审批记录不存在' }, 404);
              }

              // 权限检查：工程师审批(1级)必须engineer/admin；主任审批(2级)必须director/admin
              if (foundApproval.approvalLevel === 1 && auth.roleCode !== RoleCode.ENGINEER && auth.roleCode !== RoleCode.ADMIN) {
                return sendJson(res, { success: false, error: '您没有工程师一级审批权限' }, 403);
              }
              if (foundApproval.approvalLevel === 2 && auth.roleCode !== RoleCode.DIRECTOR && auth.roleCode !== RoleCode.ADMIN) {
                return sendJson(res, { success: false, error: '您没有主任二级审批权限' }, 403);
              }

              foundApproval.status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
              foundApproval.statusText = approved ? '已通过' : '已驳回';
              foundApproval.comment = comment;
              foundApproval.approver = auth.user;
              foundApproval.approvedAt = new Date().toISOString();

              // 状态推进
              if (foundApproval.approvalLevel === 1) {
                if (approved) {
                  foundTask.status = TaskStatus.PENDING_DIRECTOR_APPROVAL;
                } else {
                  foundTask.status = TaskStatus.ENGINEER_REJECTED;
                }
              } else if (foundApproval.approvalLevel === 2) {
                if (approved) {
                  foundTask.status = TaskStatus.COMPLETED;
                } else {
                  foundTask.status = TaskStatus.DIRECTOR_REJECTED;
                }
              }
              if (foundTask) taskStore[foundTask.id] = foundTask;

              return sendJson(res, { success: true, approval: foundApproval, task: foundTask });
            }

            const permMatch = pathWithoutQuery.match(/^\/api\/approvals\/permissions\/([^/]+)$/);
            if (permMatch && method === 'GET') {
              const roleCode = permMatch[1] as RoleCode;
              return sendJson(res, {
                success: true,
                roleCode,
                permissions: {
                  canSubmitEngineerApproval: [RoleCode.ENGINEER, RoleCode.ADMIN].includes(roleCode),
                  canProcessEngineerApproval: [RoleCode.ENGINEER, RoleCode.ADMIN].includes(roleCode),
                  canProcessDirectorApproval: [RoleCode.DIRECTOR, RoleCode.ADMIN].includes(roleCode),
                  canReviewAlerts: [RoleCode.EXPERT, RoleCode.CHIEF_SCIENTIST, RoleCode.ADMIN].includes(roleCode),
                  canSuspendPatient: [RoleCode.CHIEF_SCIENTIST, RoleCode.ADMIN].includes(roleCode),
                  canPushToNavigation: [RoleCode.TECHNICIAN, RoleCode.ADMIN].includes(roleCode)
                }
              });
            }

            if (pathWithoutQuery === '/api/approvals/check-permission' && method === 'GET') {
              const { resource, action } = query;
              const permMap: Record<string, RoleCode[]> = {
                'approval:engineer:process': [RoleCode.ENGINEER, RoleCode.ADMIN],
                'approval:director:process': [RoleCode.DIRECTOR, RoleCode.ADMIN],
                'approval:submit': [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.TECHNICIAN],
                'alert:review': [RoleCode.EXPERT, RoleCode.CHIEF_SCIENTIST, RoleCode.ADMIN],
                'patient:suspend': [RoleCode.CHIEF_SCIENTIST, RoleCode.ADMIN],
                'task:create': [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.EXPERT],
                'navigation:push': [RoleCode.TECHNICIAN, RoleCode.ADMIN]
              };
              const key = `${resource}:${action}`;
              const allowed = permMap[key] ? permMap[key].includes(auth.roleCode as RoleCode) : true;
              return sendJson(res, { success: true, hasPermission: allowed, allowed, roleCode: auth.roleCode });
            }

            const navPushMatch = pathWithoutQuery.match(/^\/api\/approvals\/navigation\/push\/([^/]+)$/);
            if (navPushMatch && method === 'POST') {
              const taskId = navPushMatch[1];
              return sendJson(res, { success: true, navigationTaskId: 'NAV-' + Date.now(), pushedAt: new Date().toISOString() });
            }
            const navStatusMatch = pathWithoutQuery.match(/^\/api\/approvals\/navigation\/status\/([^/]+)$/);
            if (navStatusMatch && method === 'GET') {
              return sendJson(res, { pushed: true, pushedAt: new Date().toISOString(), navigationTaskId: 'NAV-20240614001' });
            }

            const historyMatch2 = pathWithoutQuery.match(/^\/api\/approvals\/history\/([^/]+)$/);
            if (historyMatch2 && method === 'GET') {
              const taskId = historyMatch2[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              return sendJson(res, { success: true, history: task.approvals, count: task.approvals.length });
            }
          }

          // ============ ALERTS: /api/alerts/* ============
          if (pathWithoutQuery.startsWith('/api/alerts')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            if (pathWithoutQuery === '/api/alerts' && method === 'GET') {
              const allAlerts: any[] = [];
              Object.values(taskStore).forEach((t) => {
                t.alerts.forEach((a) => allAlerts.push(a));
              });
              return sendJson(res, { data: allAlerts, total: allAlerts.length, page: 1, pageSize: 20, totalPages: 1 });
            }
            const alertMatch = pathWithoutQuery.match(/^\/api\/alerts\/([^/]+)$/);
            if (alertMatch && method === 'GET') {
              return sendJson(res, {
                id: alertMatch[1],
                taskId: 'task_1',
                taskNo: 'TSK-2024015',
                patientName: '张某某',
                alertType: 'residual_exceeded',
                alertTypeText: '拟合残差超限',
                severity: 'warning',
                severityText: '警告',
                threshold: 10,
                actualValue: 12.3,
                unit: '%',
                description: '第23时间窗偶极子拟合残差12.3%超过阈值10%',
                suggestion: '建议调整正则化参数至0.08或切换至Beamforming算法',
                isResolved: false
              });
            }
            const reviewMatch = pathWithoutQuery.match(/^\/api\/alerts\/([^/]+)\/process$/);
            if (reviewMatch && method === 'POST') {
              return sendJson(res, { success: true, message: '预警已处理' });
            }
            if (pathWithoutQuery === '/api/alerts/review' && method === 'POST') {
              return sendJson(res, { success: true, message: '专家复核完成' });
            }
            if (pathWithoutQuery === '/api/alerts/notifications/unread-count' && method === 'GET') {
              return sendJson(res, { count: 3 });
            }
          }

          // ============ PATIENTS: /api/patients/* ============
          if (pathWithoutQuery.startsWith('/api/patients')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            if (pathWithoutQuery === '/api/patients' && method === 'GET') {
              return sendJson(res, {
                data: mockPatients,
                total: mockPatients.length,
                page: 1,
                pageSize: 20,
                totalPages: 1
              });
            }
            const ptMatch = pathWithoutQuery.match(/^\/api\/patients\/([^/]+)$/);
            if (ptMatch && method === 'GET') {
              const pid = ptMatch[1];
              const p = mockPatients.find((x) => x.id === pid) || mockPatients[0];
              return sendJson(res, p);
            }
            const ptTasksMatch = pathWithoutQuery.match(/^\/api\/patients\/([^/]+)\/tasks$/);
            if (ptTasksMatch && method === 'GET') {
              return sendJson(res, generateTaskList(5).data);
            }
          }

          // ============ REPORTS: /api/reports/* ============
          if (pathWithoutQuery.startsWith('/api/reports')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            const genMatch = pathWithoutQuery.match(/^\/api\/reports\/generate\/([^/]+)$/);
            if (genMatch && method === 'POST') {
              const taskId = genMatch[1];
              const reportId = 'rep_' + Date.now();
              return sendJson(res, {
                success: true,
                reportId,
                message: '报告生成成功'
              });
            }

            const repGetMatch = pathWithoutQuery.match(/^\/api\/reports\/([^/]+)$/);
            if (repGetMatch && !pathWithoutQuery.includes('/download') && method === 'GET') {
              return sendJson(res, {
                id: repGetMatch[1],
                taskId: 'task_1',
                taskNo: 'TSK-2024015',
                status: 'ready',
                createdAt: new Date().toISOString(),
                downloadUrl: `/api/reports/${repGetMatch[1]}/download`
              });
            }

            const dlMatch = pathWithoutQuery.match(/^\/api\/reports\/([^/]+)\/download$/);
            if (dlMatch && method === 'GET') {
              const task = taskStore['task_1'] || createMockTask(TaskStatus.COMPLETED, 100);
              const pdfBytes = await generateReportPdf(task);
              return sendPdf(res, pdfBytes, `NeuroGuide_Report_${task.taskNo}.pdf`);
            }

            if (pathWithoutQuery === '/api/reports' && method === 'GET') {
              return sendJson(res, {
                data: [
                  { id: 'rep_1', taskId: 'task_5', taskNo: 'TSK-2024014', status: 'ready', createdAt: new Date(Date.now() - 86400000).toISOString() }
                ],
                total: 1,
                page: 1,
                pageSize: 20,
                totalPages: 1
              });
            }
          }

          // ============ ANALYTICS: /api/analytics/* ============
          if (pathWithoutQuery.startsWith('/api/analytics')) {
            const auth = authUser(req);
            if (!auth) return sendJson(res, { error: '未登录或登录已过期' }, 401);

            if (pathWithoutQuery === '/api/analytics/dashboard' && method === 'GET') {
              return sendJson(res, mockAnalytics);
            }
            if (pathWithoutQuery === '/api/analytics/performance-trend' && method === 'GET') {
              return sendJson(res, mockAnalytics.trends);
            }
            if (pathWithoutQuery === '/api/analytics/clinical-effectiveness' && method === 'GET') {
              return sendJson(res, mockAnalytics.radar);
            }
            if (pathWithoutQuery === '/api/analytics/statistics' && method === 'GET') {
              return sendJson(res, mockAnalytics.summary);
            }
          }

          // ============ HEALTH ============
          if (pathWithoutQuery === '/api/health') {
            return sendJson(res, { success: true, message: 'ok', mockMode: true });
          }

          // Fallback 404
          return sendJson(res, { success: false, error: `API not found: ${method} ${pathWithoutQuery}` }, 404);

        } catch (err: any) {
          console.error('[Mock API Error]', err);
          return sendJson(res, {
            success: false,
            error: err?.message || '服务器内部错误',
            stack: err?.stack
          }, 500);
        }
      });
    }
  };
}
