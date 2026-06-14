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
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface MockTaskStore {
  [taskId: string]: ReturnType<typeof createMockTask>;
}

const taskStore: MockTaskStore = {};
const tokenBlacklist = new Set<string>();

function initDefaultTasks() {
  if (Object.keys(taskStore).length === 0) {
    const statusList = [
      { status: TaskStatus.PENDING_VALIDATION, progress: 5 },
      { status: TaskStatus.HEAD_MODEL_BUILDING, progress: 35 },
      { status: TaskStatus.FORWARD_COMPUTING, progress: 60 },
      { status: TaskStatus.SOURCE_INVERTING, progress: 80 },
      { status: TaskStatus.TARGET_EVALUATING, progress: 100 },
      { status: TaskStatus.PENDING_ENGINEER_APPROVAL, progress: 100 },
      { status: TaskStatus.PENDING_DIRECTOR_APPROVAL, progress: 100 },
      { status: TaskStatus.ENGINEER_REJECTED, progress: 75 },
      { status: TaskStatus.COMPLETED, progress: 100 },
    ];

    for (let i = 0; i < 15; i++) {
      const s = statusList[i % statusList.length];
      const t = createMockTask(s.status, s.progress);
      t.id = 'task_' + (i + 1);
      t.taskNo = 'TSK-' + (2024000 + i + 15);
      if (t.approvals && t.approvals.length > 0) {
        t.approvals.forEach((a: any, idx: number) => {
          a.id = 'appr_' + t.id + '_' + (idx + 1);
          a.taskId = t.id;
        });
      }
      taskStore[t.id] = t;
    }
  }
}

initDefaultTasks();

const statusTextMap: Record<string, string> = {
  [TaskStatus.PENDING_VALIDATION]: '待校验',
  [TaskStatus.HEAD_MODEL_BUILDING]: '头模型构建中',
  [TaskStatus.FORWARD_COMPUTING]: '正问题计算中',
  [TaskStatus.SOURCE_INVERTING]: '源反演计算中',
  [TaskStatus.TARGET_EVALUATING]: '靶点评估中',
  [TaskStatus.PENDING_ENGINEER_APPROVAL]: '待工程师审批',
  [TaskStatus.ENGINEER_REJECTED]: '工程师已驳回',
  [TaskStatus.PENDING_DIRECTOR_APPROVAL]: '待主任审批',
  [TaskStatus.DIRECTOR_REJECTED]: '主任已驳回',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.PUSHING_TO_NAVIGATION]: '推送导航系统中',
};

function getStatusText(status: string): string {
  return statusTextMap[status] || status;
}

function sendJson(res: any, data: any, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(data));
}

function sendPdf(res: any, pdfBytes: Uint8Array, filename: string) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBytes.length.toString());
  res.end(Buffer.from(pdfBytes));
}

async function readBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    try {
      return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return {};
    }
  }
  if (req.readableEnded || req.complete || req.destroyed) {
    return {};
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    return {};
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({}), 2000);
    const chunks: Buffer[] = [];
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
    };
    const onData = (chunk: any) => { if (!done) chunks.push(Buffer.from(chunk)); };
    const onEnd = () => {
      if (done) return;
      cleanup();
      const data = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    };
    const onError = () => { cleanup(); resolve({}); };
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    if (typeof req.read === 'function') {
      try { const _ = req.read(); } catch {}
    }
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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }
  if (tokenBlacklist.has(token)) {
    return null;
  }
  const parsed = parseMockToken(token);
  if (!parsed) return null;
  const userEntry = Object.values(mockUsers).find((u) => u.user.id === parsed.id);
  if (!userEntry) return null;
  return { ...parsed, user: userEntry.user };
}

function sanitizeText(text: string): string {
  const result: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 255) {
      result.push(text[i]);
    } else {
      result.push('[?]');
    }
  }
  return result.join('');
}

async function generateReportPdf(task: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - 50;

  const fmtNum = (v: number | undefined | null, decimals = 2, fallback = 'N/A'): string => {
    if (v === undefined || v === null || typeof v !== 'number' || isNaN(v)) return fallback;
    return v.toFixed(decimals);
  };

  const drawText = (text: string, opts: any = {}) => {
    const font = opts.bold ? helveticaBoldFont : helveticaFont;
    const size = opts.size || 11;
    const color = opts.color || rgb(0, 0, 0);
    const safeText = sanitizeText(text);
    try {
      page.drawText(safeText, {
        x: opts.x || 50,
        y,
        size,
        font,
        color
      });
    } catch (e) {
      try {
        page.drawText('[Unsupported character]', {
          x: opts.x || 50,
          y,
          size,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5)
        });
      } catch (_) {
      }
    }
    if (opts.newline !== false) {
      y -= (opts.lineHeight || size + 4);
    }
    if (y < 60) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
  };

  const drawSeparator = () => {
    try {
      page.drawLine({
        start: { x: 50, y: y + 2 },
        end: { x: width - 50, y: y + 2 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7)
      });
    } catch (_) {
    }
    y -= 12;
  };

  const pName = sanitizeText(task.patient?.name || 'Unknown');
  const pDiagnosis = sanitizeText(task.patient?.diagnosis || 'N/A');
  const pGender = sanitizeText(task.patient?.gender || 'N/A');
  const tName = sanitizeText(task.taskName || 'Untitled');
  const algoText = sanitizeText(task.algorithmTypeText || 'sLORETA');
  const brainRegion = sanitizeText(task.targetBrainRegionText || 'Not specified');
  const pulseText = sanitizeText(task.targetPlan?.pulsePatternText || '10Hz rTMS');
  const tradeReason = task.targetPlan?.alternativePlans?.[0]?.tradeOffReason
    ? sanitizeText(task.targetPlan.alternativePlans[0].tradeOffReason)
    : 'N/A';

  drawText('NEUROGUIDE EEG Source Localization Report', { bold: true, size: 16, color: rgb(0.1, 0.25, 0.6), lineHeight: 24 });
  drawText(`Task No: ${task.taskNo}`, { size: 10, color: rgb(0.4, 0.4, 0.4), lineHeight: 16 });
  drawText(`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`, { size: 10, color: rgb(0.4, 0.4, 0.4), lineHeight: 24 });
  drawSeparator();

  drawText('1. Patient and Task Information', { bold: true, size: 13, color: rgb(0.1, 0.25, 0.6), lineHeight: 22 });
  drawText(`Patient Name: ${pName}`);
  drawText(`Medical Record No: ${task.patient?.medicalRecordNo || 'N/A'}`);
  drawText(`Gender/Age: ${pGender} / ${task.patient?.age || 'N/A'} years`);
  drawText(`Diagnosis: ${pDiagnosis}`);
  drawText(`Task Name: ${tName}`);
  drawText(`Algorithm: ${algoText}`);
  drawText(`Target Brain Region: ${brainRegion}`);
  y -= 8;
  drawSeparator();

  if (task.sourceResult) {
    const sr = task.sourceResult;
    drawText('2. Cortical Current Density Distribution', { bold: true, size: 13, color: rgb(0.1, 0.25, 0.6), lineHeight: 22 });
    const pos = sr.dipoleParameters.position;
    drawText(`Dipole Position (MNI mm): X=${fmtNum(pos?.[0])}, Y=${fmtNum(pos?.[1])}, Z=${fmtNum(pos?.[2])}`);
    const mom = sr.dipoleParameters.moment || [];
    drawText(`Dipole Moment: (${mom.map((v: number) => fmtNum(v, 3)).join(', ')})`);
    drawText(`Goodness of Fit (GOF): ${fmtNum(sr.dipoleParameters.goodnessOfFit ? sr.dipoleParameters.goodnessOfFit * 100 : undefined, 1)}%`);
    drawText(`Mean Residual: ${fmtNum(sr.meanResidual)}%  (Threshold: 10%)`);
    drawText(`Source Localization Accuracy: ${fmtNum(sr.sourceSpatialAccuracy)} mm`);
    drawText(`Regularization Parameter (lambda): ${sr.regularizationParam}`);
    y -= 6;
    drawText('[Note] See 3D visualization module for full current density map.', {
      size: 9, color: rgb(0.4, 0.4, 0.4), lineHeight: 14
    });
    y -= 8;
    drawSeparator();

    drawText('3. Source Activity Time Series', { bold: true, size: 13, color: rgb(0.1, 0.25, 0.6), lineHeight: 22 });
    drawText(`Sampling Rate: ${sr.sourceTimeSeries.samplingRate} Hz`);
    drawText(`Signal Unit: ${sr.sourceTimeSeries.unit}`);
    drawText(`Time Window: ${task.algorithmParams.timeWindow}ms (Overlap ${task.algorithmParams.overlap}%)`);
    drawText(`Frequency Bands: Delta(1-4Hz) / Theta(4-8Hz) / Alpha(8-13Hz) / Beta(13-30Hz) / Gamma(30-100Hz)`);
    drawText(`Abnormal Time Windows: ${sr.monitoringMetrics.filter((m: any) => m.isAlertTriggered).length} / ${sr.monitoringMetrics.length}`);
    y -= 6;
    drawText('[Note] See chart module for time series and spectrum plots.', {
      size: 9, color: rgb(0.4, 0.4, 0.4), lineHeight: 14
    });
    y -= 8;
    drawSeparator();

    drawText('4. Dipole Confidence Ellipsoid', { bold: true, size: 13, color: rgb(0.1, 0.25, 0.6), lineHeight: 22 });
    const ce = sr.confidenceEllipsoid;
    drawText(`Confidence Level: ${fmtNum(ce?.confidenceLevel ? ce.confidenceLevel * 100 : undefined, 0)}%`);
    const ceCenter = ce?.center || [];
    drawText(`Ellipsoid Center: (${ceCenter.map((v: number) => fmtNum(v, 2)).join(', ')}) mm`);
    const ceRadii = ce?.radii || [];
    drawText(`Principal Radii: X=${fmtNum(ceRadii[0])}, Y=${fmtNum(ceRadii[1])}, Z=${fmtNum(ceRadii[2])} mm`);
    const volume = ceRadii[0] && ceRadii[1] && ceRadii[2]
      ? ((4 / 3) * Math.PI * ceRadii[0] * ceRadii[1] * ceRadii[2])
      : undefined;
    drawText(`Volume: ${fmtNum(volume)} mm^3`);
    y -= 6;
    drawText('[Note] See confidence ellipse module for 2D projection.', {
      size: 9, color: rgb(0.4, 0.4, 0.4), lineHeight: 14
    });
    y -= 8;
    drawSeparator();
  }

  if (task.targetPlan) {
    const tp = task.targetPlan;
    drawText('5. TMS Coil Placement and Stimulation Protocol', { bold: true, size: 13, color: rgb(0.1, 0.25, 0.6), lineHeight: 22 });
    const coilPos = tp.coilPosition || [];
    drawText(`Target Coordinates (MNI mm): (${coilPos.map((v: number) => fmtNum(v, 2)).join(', ')})`);
    const coilOrient = tp.coilOrientation || {};
    drawText(`Coil Orientation: ${fmtNum(coilOrient.angleDegrees, 1)} deg (relative to AC-PC line)`);
    const normalVec = coilOrient.normal || [];
    drawText(`Coil Normal Vector: (${normalVec.map((v: number) => fmtNum(v, 3)).join(', ')})`);
    const handleVec = coilOrient.handleDirection || [];
    drawText(`Handle Direction: (${handleVec.map((v: number) => fmtNum(v, 3)).join(', ')})`);
    drawText(`Current Intensity: ${fmtNum(tp.currentIntensity, 2)} A/m^2`);
    drawText(`Stimulation Pattern: ${pulseText}`);
    drawText(`Total Pulses: ${tp.pulseCount || 'N/A'}`);
    drawText(`Stimulation Volume: ${fmtNum(tp.stimulationVolume, 2)} cm^3`);
    y -= 4;
    drawText(`Focality: ${fmtNum(tp.focalityIndex ? tp.focalityIndex * 100 : undefined, 1)}%    Coverage: ${fmtNum(tp.targetCoverage ? tp.targetCoverage * 100 : undefined, 1)}%`, { size: 10, color: rgb(0.2, 0.5, 0.9), lineHeight: 14 });
    if (tp.isAIRecommended && tp.aiRecommendationParams) {
      const ai = tp.aiRecommendationParams;
      drawText(`AI Confidence: ${fmtNum(ai.confidence ? ai.confidence * 100 : undefined, 0)}%   Historical Similarity: ${fmtNum(ai.historicalSimilarity ? ai.historicalSimilarity * 100 : undefined, 0)}%`, {
        size: 10, color: rgb(0.2, 0.5, 0.9), lineHeight: 16
      });
    }
    y -= 8;

    if (tp.alternativePlans && tp.alternativePlans.length > 0) {
      drawText('Alternative Plans:', { bold: true, size: 11, lineHeight: 16 });
      tp.alternativePlans.forEach((alt: any, i: number) => {
        const posStr = alt.coilPosition ? alt.coilPosition.map((v: number) => fmtNum(v, 1)).join(',') : 'N/A';
        const angle = alt.coilOrientation?.angleDegrees ?? alt.angleDegrees;
        const tradeStr = sanitizeText(alt.tradeOffReason || alt.tradeReason || 'N/A');
        drawText(`  Plan ${i + 1}: Pos(${posStr})  Angle ${fmtNum(angle, 0)}deg  Intensity ${fmtNum(alt.currentIntensity, 2)}A/m^2`, { size: 9, lineHeight: 13 });
        drawText(`           Focality ${fmtNum(alt.focalityIndex ? alt.focalityIndex * 100 : undefined, 0)}%  Coverage ${fmtNum(alt.targetCoverage ? alt.targetCoverage * 100 : undefined, 0)}%  Tradeoff: ${tradeStr}`, { size: 9, lineHeight: 16 });
      });
    }
    y -= 6;
    drawSeparator();
  }

  drawText('6. Approval Process Records', { bold: true, size: 13, color: rgb(0.1, 0.25, 0.6), lineHeight: 22 });
  (task.approvals || []).forEach((app: any) => {
    const statusText = app.status === ApprovalStatus.APPROVED ? 'APPROVED' : app.status === ApprovalStatus.REJECTED ? 'REJECTED' : 'PENDING';
    const levelText = app.approvalLevelText ? sanitizeText(app.approvalLevelText) : `Level ${app.approvalLevel}`;
    drawText(`${levelText}: ${statusText}`, { size: 11, lineHeight: 16 });
    if (app.approver) {
      const approverName = sanitizeText(app.approver.fullName || 'Unknown');
      const approverTitle = sanitizeText(app.approver.title || '');
      drawText(`  Approver: ${approverName} (${approverTitle})`, { size: 10, lineHeight: 14 });
    }
    if (app.comment) {
      const commentText = sanitizeText(app.comment);
      drawText(`  Comment: ${commentText}`, { size: 10, lineHeight: 18 });
    }
    if (app.approvedAt) {
      drawText(`  Time: ${new Date(app.approvedAt).toISOString().replace('T', ' ').slice(0, 19)}`, { size: 10, lineHeight: 18 });
    }
  });
  y -= 10;

  drawText('--------------------------------------------------', {
    size: 10, color: rgb(0.6, 0.6, 0.6), lineHeight: 14
  });
  drawText('This report is automatically generated by NeuroGuide Platform.', {
    size: 9, color: rgb(0.5, 0.5, 0.5), lineHeight: 14
  });
  drawText('For clinical research reference only. (c) 2024 NeuroGuide', {
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
          if (pathWithoutQuery.startsWith('/api/auth')) {
            if (pathWithoutQuery === '/api/auth/login' && method === 'POST') {
              const body = await readBody(req);
              if (!body.username || !body.password) {
                return sendJson(res, {
                  success: false,
                  error: '用户名和密码不能为空',
                  message: '用户名和密码不能为空'
                }, 400);
              }
              const entry = mockUsers[body.username];
              if (!entry) {
                return sendJson(res, {
                  success: false,
                  error: '账号不存在，请检查用户名是否正确',
                  message: '账号不存在',
                  code: 'USER_NOT_FOUND'
                }, 401);
              }
              if (entry.password !== body.password) {
                return sendJson(res, {
                  success: false,
                  error: '密码错误，请重新输入',
                  message: '密码错误',
                  code: 'PASSWORD_INCORRECT'
                }, 401);
              }
              return sendJson(res, generateAuthResponse(entry.user));
            }

            if (pathWithoutQuery === '/api/auth/register' && method === 'POST') {
              const body = await readBody(req);
              if (!body.username || !body.password || !body.fullName) {
                return sendJson(res, {
                  success: false,
                  error: '用户名、密码和姓名不能为空',
                  message: '用户名、密码和姓名不能为空'
                }, 400);
              }
              if (mockUsers[body.username]) {
                return sendJson(res, {
                  success: false,
                  error: '该用户名已被注册，请使用其他用户名',
                  message: '该用户名已存在',
                  code: 'USERNAME_EXISTS'
                }, 400);
              }
              const newUser = {
                id: 'u_' + Date.now(),
                username: body.username,
                fullName: body.fullName,
                title: body.title || '临床工程师',
                roleCode: body.roleCode || RoleCode.ENGINEER,
                roleName: body.roleCode === RoleCode.ADMIN ? '系统管理员'
                  : body.roleCode === RoleCode.DIRECTOR ? '神经内科主任'
                  : body.roleCode === RoleCode.EXPERT ? '神经电生理专家'
                  : body.roleCode === RoleCode.CHIEF_SCIENTIST ? '首席科学家'
                  : body.roleCode === RoleCode.TECHNICIAN ? '实验室技术员'
                  : '临床工程师'
              };
              mockUsers[body.username] = { password: body.password, user: newUser };
              return sendJson(res, generateAuthResponse(newUser));
            }

            if (pathWithoutQuery === '/api/auth/logout' && method === 'POST') {
              const authHeader = req.headers['authorization'] || '';
              if (authHeader.startsWith('Bearer ')) {
                const token = authHeader.replace('Bearer ', '').trim();
                if (token && token !== 'null' && token !== 'undefined') {
                  tokenBlacklist.add(token);
                }
              }
              return sendJson(res, {
                success: true,
                message: '已成功退出登录',
                code: 'LOGGED_OUT'
              });
            }

            if (pathWithoutQuery === '/api/auth/me' && method === 'GET') {
              const auth = authUser(req);
              if (!auth) {
                return sendJson(res, {
                  error: '未登录或登录已过期，请重新登录',
                  message: '未登录或登录已过期',
                  code: 'NOT_LOGGED_IN'
                }, 401);
              }
              return sendJson(res, auth.user);
            }
          }

          if (pathWithoutQuery.startsWith('/api/tasks')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

            if (pathWithoutQuery === '/api/tasks' && method === 'GET') {
              const tasks = Object.values(taskStore);
              return sendJson(res, {
                data: tasks,
                total: tasks.length,
                page: 1,
                pageSize: tasks.length,
                success: true
              });
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

          if (pathWithoutQuery.startsWith('/api/workflow')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

            const transitionsMatch = pathWithoutQuery.match(/^\/api\/workflow\/transitions\/([^/]+)$/);
            if (transitionsMatch && method === 'GET') {
              try {
                const taskId = transitionsMatch[1];
                const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
                const validTransitions = getValidTransitions(task.status, auth.roleCode as RoleCode);
                return sendJson(res, {
                  success: true,
                  currentStatus: task.status,
                  currentStatusText: task.statusText || '',
                  validTransitions
                });
              } catch (err: any) {
                return sendJson(res, {
                  success: false,
                  error: '获取可执行流转失败: ' + (err?.message || '未知错误'),
                  validTransitions: []
                }, 500);
              }
            }

            const transitionMatch = pathWithoutQuery.match(/^\/api\/workflow\/transition\/([^/]+)$/);
            if (transitionMatch && method === 'POST') {
              const taskId = transitionMatch[1];
              const body = await readBody(req);
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              const valid = getValidTransitions(task.status, auth.roleCode as RoleCode);
              const targetTransition = valid.find((t: any) => t.targetStatus === body.targetStatus);
              if (!targetTransition) {
                return sendJson(res, {
                  success: false,
                  error: '无权执行此状态转换，或当前状态不支持该操作',
                  message: '状态转换无效',
                  code: 'INVALID_TRANSITION'
                }, 403);
              }
              task.status = body.targetStatus as TaskStatus;
              task.statusText = getStatusText(task.status);
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
              return sendJson(res, {
                success: true,
                task: taskStore[taskId],
                message: targetTransition.label
              });
            }
          }

          if (pathWithoutQuery.startsWith('/api/compute')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

            const stepMatch = pathWithoutQuery.match(/^\/api\/compute\/([^/]+)\/([^/]+)$/);
            if (stepMatch && method === 'POST') {
              const taskId = stepMatch[1];
              const step = stepMatch[2];
              const task = taskStore[taskId] || createMockTask(TaskStatus.PENDING_VALIDATION, 5);
              const stepMap: Record<string, { status: TaskStatus; progress: number; data?: any }> = {
                'head-model': { status: TaskStatus.HEAD_MODEL_BUILDING, progress: 25, data: mockHeadModel },
                'forward': { status: TaskStatus.FORWARD_COMPUTING, progress: 50, data: mockForwardResult },
                'source': { status: TaskStatus.SOURCE_INVERTING, progress: 75, data: mockSourceResult },
                'target': { status: TaskStatus.TARGET_EVALUATING, progress: 100, data: mockTargetPlan },
              };
              const conf = stepMap[step];
              if (!conf) {
                return sendJson(res, {
                  success: false,
                  error: '未知计算步骤: ' + step,
                  message: '未知计算步骤'
                }, 400);
              }
              task.status = conf.status;
              task.progress = conf.progress;
              if (step === 'head-model') task.headModel = conf.data;
              if (step === 'forward') task.forwardResult = conf.data;
              if (step === 'source') task.sourceResult = conf.data;
              if (step === 'target') {
                task.sourceResult = mockSourceResult;
                task.targetPlan = conf.data;
              }
              task.timeline.push({
                id: 't_' + Date.now(),
                fromStatus: task.status,
                toStatus: conf.status,
                toStatusText: '计算步骤完成',
                reason: step,
                operator: auth.user,
                createdAt: new Date().toISOString()
              });
              taskStore[taskId] = task;
              return sendJson(res, {
                success: true,
                task: taskStore[taskId],
                data: conf.data,
                message: `${step} 计算完成`
              });
            }
          }

          if (pathWithoutQuery.startsWith('/api/approvals')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

            const getApprovalList = (status: string, level: number | null = null) => {
              const allApprovals: any[] = [];
              Object.values(taskStore).forEach((t) => {
                t.approvals.forEach((a: any) => {
                  if (status && a.status !== status) return;
                  if (level && a.approvalLevel !== level) return;
                  allApprovals.push({
                    ...a,
                    taskId: t.id,
                    taskNo: t.taskNo,
                    patientName: t.patient?.name || '未知',
                    taskStatus: t.status,
                    taskStatusText: t.statusText
                  });
                });
              });
              return allApprovals;
            };

            const getMyApprovalList = (status: string) => {
              const allApprovals = getApprovalList(status, null);
              if (auth.roleCode === RoleCode.ENGINEER) {
                return allApprovals.filter((a) => a.approvalLevel === 1);
              }
              if (auth.roleCode === RoleCode.DIRECTOR) {
                return allApprovals.filter((a) => a.approvalLevel === 2);
              }
              return allApprovals;
            };

            if (pathWithoutQuery === '/api/approvals' && method === 'GET') {
              const status = query.status || 'pending';
              const level = query.level ? parseInt(query.level) : null;
              const list = getMyApprovalList(status);
              if (level) {
                const filtered = list.filter((a) => a.approvalLevel === level);
                return sendJson(res, { success: true, data: filtered, total: filtered.length, page: 1, pageSize: 20, totalPages: 1 });
              }
              return sendJson(res, { success: true, data: list, total: list.length, page: 1, pageSize: 20, totalPages: 1 });
            }

            if (pathWithoutQuery === '/api/approvals/pending' && method === 'GET') {
              const list = getMyApprovalList('pending');
              return sendJson(res, { success: true, data: list, total: list.length, page: 1, pageSize: 20, totalPages: 1 });
            }

            const submitMatch = pathWithoutQuery.match(/^\/api\/approvals\/submit\/([^/]+)$/);
            if (submitMatch && method === 'POST') {
              const taskId = submitMatch[1];
              const body = await readBody(req);
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              const allowedRoles = [RoleCode.ENGINEER, RoleCode.ADMIN, RoleCode.TECHNICIAN];
              if (!allowedRoles.includes(auth.roleCode as RoleCode)) {
                return sendJson(res, {
                  success: false,
                  error: '您没有提交审批的权限，请联系临床工程师或管理员',
                  message: '无提交审批权限',
                  code: 'PERMISSION_DENIED'
                }, 403);
              }
              const level = body.level || 1;
              const existingApproval = task.approvals.find((a: any) => a.approvalLevel === level);
              if (!existingApproval) {
                return sendJson(res, {
                  success: false,
                  error: '该任务未配置对应级别的审批流程',
                  message: '审批流程不存在'
                }, 404);
              }
              if (existingApproval.status !== ApprovalStatus.PENDING) {
                return sendJson(res, {
                  success: false,
                  error: '该审批已被处理，无法重复提交',
                  message: '审批已处理'
                }, 400);
              }
              task.status = level === 1 ? TaskStatus.PENDING_ENGINEER_APPROVAL : TaskStatus.PENDING_DIRECTOR_APPROVAL;
              task.statusText = getStatusText(task.status);
              task.timeline.push({
                id: 't_' + Date.now(),
                fromStatus: task.status,
                toStatus: task.status,
                toStatusText: level === 1 ? '提交工程师审批' : '提交主任审批',
                reason: body.comment || '提交审批',
                operator: auth.user,
                createdAt: new Date().toISOString()
              });
              taskStore[taskId] = task;
              return sendJson(res, {
                success: true,
                approval: existingApproval,
                task: taskStore[taskId],
                message: '已提交审批'
              });
            }

            const procMatch = pathWithoutQuery.match(/^\/api\/approvals\/process\/([^/]+)$/);
            if (procMatch && method === 'POST') {
              const approvalId = procMatch[1];
              const body = await readBody(req);
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
                return sendJson(res, {
                  success: false,
                  error: '审批记录不存在',
                  message: '审批记录不存在',
                  code: 'NOT_FOUND'
                }, 404);
              }

              if (foundApproval.status !== ApprovalStatus.PENDING) {
                return sendJson(res, {
                  success: false,
                  error: '该审批已被处理，无法重复操作',
                  message: '审批已处理'
                }, 400);
              }

              if (foundApproval.approvalLevel === 1
                && auth.roleCode !== RoleCode.ENGINEER
                && auth.roleCode !== RoleCode.ADMIN) {
                return sendJson(res, {
                  success: false,
                  error: '只有临床工程师或系统管理员可以处理一级审批',
                  message: '您没有工程师一级审批权限',
                  code: 'PERMISSION_DENIED'
                }, 403);
              }
              if (foundApproval.approvalLevel === 2
                && auth.roleCode !== RoleCode.DIRECTOR
                && auth.roleCode !== RoleCode.ADMIN) {
                return sendJson(res, {
                  success: false,
                  error: '只有神经内科主任或系统管理员可以处理二级审批',
                  message: '您没有主任二级审批权限',
                  code: 'PERMISSION_DENIED'
                }, 403);
              }

              foundApproval.status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
              foundApproval.statusText = approved ? '已通过' : '已驳回';
              foundApproval.comment = comment;
              foundApproval.approver = auth.user;
              foundApproval.approvedAt = new Date().toISOString();

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
              foundTask.statusText = getStatusText(foundTask.status);
              foundTask.timeline.push({
                id: 't_' + Date.now(),
                fromStatus: foundTask.status,
                toStatus: foundTask.status,
                toStatusText: approved ? '审批通过' : '审批驳回',
                reason: comment || (approved ? '同意' : '驳回'),
                operator: auth.user,
                createdAt: new Date().toISOString()
              });
              if (foundTask) taskStore[foundTask.id] = foundTask;

              return sendJson(res, {
                success: true,
                approval: foundApproval,
                task: foundTask,
                message: approved ? '审批通过' : '审批已驳回'
              });
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

            const historyMatch2 = pathWithoutQuery.match(/^\/api\/approvals\/history\/([^/]+)$/);
            if (historyMatch2 && method === 'GET') {
              const taskId = historyMatch2[1];
              const task = taskStore[taskId] || createMockTask(TaskStatus.TARGET_EVALUATING, 100);
              return sendJson(res, { success: true, history: task.approvals, count: task.approvals.length });
            }
          }

          if (pathWithoutQuery.startsWith('/api/alerts')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

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
                patientName: 'Patient',
                alertType: 'residual_exceeded',
                alertTypeText: 'Residual exceeded',
                severity: 'warning',
                severityText: 'Warning',
                threshold: 10,
                actualValue: 12.3,
                unit: '%',
                description: 'Time window 23 residual error 12.3% exceeds threshold 10%',
                suggestion: 'Suggest adjusting regularization parameter to 0.08 or switching to Beamforming algorithm',
                isResolved: false
              });
            }
            const reviewMatch = pathWithoutQuery.match(/^\/api\/alerts\/([^/]+)\/process$/);
            if (reviewMatch && method === 'POST') {
              return sendJson(res, { success: true, message: 'Alert processed' });
            }
            if (pathWithoutQuery === '/api/alerts/notifications/unread-count' && method === 'GET') {
              return sendJson(res, { count: 3 });
            }
          }

          if (pathWithoutQuery.startsWith('/api/patients')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

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

          if (pathWithoutQuery.startsWith('/api/reports')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

            const genMatch = pathWithoutQuery.match(/^\/api\/reports\/generate\/([^/]+)$/);
            if (genMatch && method === 'POST') {
              const taskId = genMatch[1];
              const reportId = 'rep_' + Date.now();
              const task = taskStore[taskId] || createMockTask(TaskStatus.COMPLETED, 100);
              if (!task.sourceResult || !task.targetPlan) {
                return sendJson(res, {
                  success: false,
                  error: '源定位或靶点评估尚未完成，无法生成综合报告',
                  message: '计算步骤未完成'
                }, 400);
              }
              return sendJson(res, {
                success: true,
                reportId,
                downloadUrl: `/api/reports/${reportId}/download`,
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

          if (pathWithoutQuery.startsWith('/api/analytics')) {
            const auth = authUser(req);
            if (!auth) {
              return sendJson(res, {
                error: '未登录或登录已过期，请重新登录',
                message: '未登录或登录已过期',
                code: 'NOT_LOGGED_IN'
              }, 401);
            }

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

          if (pathWithoutQuery === '/api/health') {
            return sendJson(res, { success: true, message: 'ok', mockMode: true });
          }

          return sendJson(res, {
            success: false,
            error: `API not found: ${method} ${pathWithoutQuery}`,
            message: '接口不存在'
          }, 404);

        } catch (err: any) {
          console.error('[Mock API Error]', err?.message || err);
          if (err?.stack) {
            console.error(err.stack);
          }
          return sendJson(res, {
            success: false,
            error: '服务器内部错误: ' + (err?.message || '未知错误'),
            message: '服务器内部错误'
          }, 500);
        }
      });
    }
  };
}
