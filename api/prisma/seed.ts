import { PrismaClient, RoleCode, AlgorithmType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据库种子数据...');

  const roles = await prisma.role.createMany({
    data: [
      {
        name: '系统管理员',
        code: RoleCode.ADMIN,
        permissions: {
          users: ['create', 'read', 'update', 'delete'],
          roles: ['create', 'read', 'update', 'delete'],
          tasks: ['read', 'delete'],
          patients: ['create', 'read', 'update', 'delete'],
          approvals: ['read'],
          alerts: ['read', 'resolve'],
          reports: ['read', 'create', 'delete'],
          analytics: ['read'],
          settings: ['read', 'update'],
          export: ['create', 'read']
        },
        description: '系统最高权限管理员'
      },
      {
        name: '临床工程师',
        code: RoleCode.ENGINEER,
        permissions: {
          tasks: ['create', 'read', 'update', 'delete'],
          patients: ['create', 'read', 'update'],
          files: ['create', 'read', 'delete'],
          approvals: ['create', 'read', 'update'],
          alerts: ['read'],
          reports: ['read', 'create'],
          source: ['read', 'update'],
          targeting: ['read', 'update'],
          export: ['create', 'read']
        },
        description: '负责数据上传、任务创建和源定位验证'
      },
      {
        name: '神经内科主任',
        code: RoleCode.DIRECTOR,
        permissions: {
          tasks: ['read'],
          patients: ['read'],
          approvals: ['read', 'update'],
          alerts: ['read'],
          reports: ['read'],
          analytics: ['read'],
          source: ['read'],
          targeting: ['read']
        },
        description: '负责治疗方案审批和病例复核'
      },
      {
        name: '神经电生理专家',
        code: RoleCode.EXPERT,
        permissions: {
          tasks: ['read'],
          patients: ['read'],
          alerts: ['read', 'update', 'resolve'],
          source: ['read', 'update'],
          reports: ['read'],
          analytics: ['read']
        },
        description: '负责异常预警复核和算法调整建议'
      },
      {
        name: '首席科学家',
        code: RoleCode.CHIEF_SCIENTIST,
        permissions: {
          tasks: ['read', 'delete'],
          patients: ['read', 'update', 'suspend'],
          alerts: ['read', 'update', 'resolve'],
          analytics: ['read'],
          source: ['read', 'update'],
          targeting: ['read', 'update'],
          reports: ['read', 'create', 'delete'],
          settings: ['read', 'update'],
          export: ['create', 'read']
        },
        description: '负责患者异常处理、算法优化和数据分析'
      },
      {
        name: '实验室技术员',
        code: RoleCode.TECHNICIAN,
        permissions: {
          tasks: ['read'],
          patients: ['read'],
          targeting: ['read'],
          reports: ['read']
        },
        description: '负责查看治疗方案和执行刺激'
      }
    ],
    skipDuplicates: true
  });

  console.log(`✅ 创建了 ${roles.count} 个角色`);

  const adminRole = await prisma.role.findUnique({
    where: { code: RoleCode.ADMIN }
  });

  const engineerRole = await prisma.role.findUnique({
    where: { code: RoleCode.ENGINEER }
  });

  const directorRole = await prisma.role.findUnique({
    where: { code: RoleCode.DIRECTOR }
  });

  const expertRole = await prisma.role.findUnique({
    where: { code: RoleCode.EXPERT }
  });

  const scientistRole = await prisma.role.findUnique({
    where: { code: RoleCode.CHIEF_SCIENTIST }
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await prisma.user.createMany({
    data: [
      {
        username: 'admin',
        email: 'admin@hospital.com',
        passwordHash: hashedPassword,
        roleId: adminRole!.id,
        fullName: '系统管理员',
        title: '系统管理员',
        isActive: true
      },
      {
        username: 'engineer1',
        email: 'engineer1@hospital.com',
        passwordHash: hashedPassword,
        roleId: engineerRole!.id,
        fullName: '张工',
        title: '临床工程师',
        isActive: true
      },
      {
        username: 'engineer2',
        email: 'engineer2@hospital.com',
        passwordHash: hashedPassword,
        roleId: engineerRole!.id,
        fullName: '李工',
        title: '临床工程师',
        isActive: true
      },
      {
        username: 'director1',
        email: 'director1@hospital.com',
        passwordHash: hashedPassword,
        roleId: directorRole!.id,
        fullName: '王主任',
        title: '神经内科主任',
        isActive: true
      },
      {
        username: 'expert1',
        email: 'expert1@hospital.com',
        passwordHash: hashedPassword,
        roleId: expertRole!.id,
        fullName: '陈专家',
        title: '神经电生理专家',
        isActive: true
      },
      {
        username: 'scientist1',
        email: 'scientist1@hospital.com',
        passwordHash: hashedPassword,
        roleId: scientistRole!.id,
        fullName: '刘首席',
        title: '首席科学家',
        isActive: true
      }
    ],
    skipDuplicates: true
  });

  console.log(`✅ 创建了 ${users.count} 个用户`);

  const algorithmConfigs = await prisma.algorithmConfig.createMany({
    data: [
      {
        algorithmName: AlgorithmType.SLORETA,
        defaultParams: {
          regularizationParam: 0.01,
          timeWindow: 100,
          overlap: 50,
          maxIterations: 100,
          convergenceThreshold: 1e-6
        },
        paramRanges: {
          regularizationParam: { min: 0.001, max: 0.1, step: 0.001, default: 0.01 },
          timeWindow: { min: 50, max: 500, step: 10, default: 100 },
          overlap: { min: 0, max: 90, step: 5, default: 50 },
          maxIterations: { min: 10, max: 1000, step: 10, default: 100 },
          convergenceThreshold: { min: 1e-8, max: 1e-4, step: 1e-7, default: 1e-6 }
        },
        isEnabled: true,
        description: '标准化低分辨率电磁断层扫描，提供高空间分辨率的源成像'
      },
      {
        algorithmName: AlgorithmType.BEAMFORMING,
        defaultParams: {
          regularizationParam: 0.05,
          timeWindow: 200,
          overlap: 100,
          maxIterations: 50,
          convergenceThreshold: 1e-5
        },
        paramRanges: {
          regularizationParam: { min: 0.01, max: 0.2, step: 0.01, default: 0.05 },
          timeWindow: { min: 100, max: 1000, step: 50, default: 200 },
          overlap: { min: 0, max: 90, step: 5, default: 100 },
          maxIterations: { min: 10, max: 500, step: 10, default: 50 },
          convergenceThreshold: { min: 1e-8, max: 1e-4, step: 1e-7, default: 1e-5 }
        },
        isEnabled: true,
        description: '波束形成算法，适合实时脑电源成像和功能连接分析'
      },
      {
        algorithmName: AlgorithmType.MNLS,
        defaultParams: {
          regularizationParam: 0.02,
          timeWindow: 150,
          overlap: 75,
          maxIterations: 200,
          convergenceThreshold: 1e-6
        },
        paramRanges: {
          regularizationParam: { min: 0.005, max: 0.15, step: 0.005, default: 0.02 },
          timeWindow: { min: 50, max: 500, step: 10, default: 150 },
          overlap: { min: 0, max: 90, step: 5, default: 75 },
          maxIterations: { min: 50, max: 500, step: 10, default: 200 },
          convergenceThreshold: { min: 1e-8, max: 1e-4, step: 1e-7, default: 1e-6 }
        },
        isEnabled: true,
        description: '多重稀疏约束算法，提供更优的源定位稀疏性'
      },
      {
        algorithmName: AlgorithmType.LORETA,
        defaultParams: {
          regularizationParam: 0.03,
          timeWindow: 100,
          overlap: 50,
          maxIterations: 100,
          convergenceThreshold: 1e-6
        },
        paramRanges: {
          regularizationParam: { min: 0.005, max: 0.1, step: 0.005, default: 0.03 },
          timeWindow: { min: 50, max: 500, step: 10, default: 100 },
          overlap: { min: 0, max: 90, step: 5, default: 50 },
          maxIterations: { min: 10, max: 500, step: 10, default: 100 },
          convergenceThreshold: { min: 1e-8, max: 1e-4, step: 1e-7, default: 1e-6 }
        },
        isEnabled: true,
        description: '低分辨率电磁断层扫描，经典源成像算法'
      },
      {
        algorithmName: AlgorithmType.DICS,
        defaultParams: {
          regularizationParam: 0.04,
          timeWindow: 300,
          overlap: 150,
          maxIterations: 80,
          convergenceThreshold: 1e-5
        },
        paramRanges: {
          regularizationParam: { min: 0.01, max: 0.2, step: 0.01, default: 0.04 },
          timeWindow: { min: 100, max: 1000, step: 50, default: 300 },
          overlap: { min: 0, max: 90, step: 5, default: 150 },
          maxIterations: { min: 20, max: 200, step: 10, default: 80 },
          convergenceThreshold: { min: 1e-8, max: 1e-4, step: 1e-7, default: 1e-5 }
        },
        isEnabled: true,
        description: '动态成像相干源，适合频域源成像和功能连接分析'
      }
    ],
    skipDuplicates: true
  });

  console.log(`✅ 创建了 ${algorithmConfigs.count} 个算法配置`);

  const systemSettings = await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      residualThreshold: 10,
      sourceOffsetThreshold: 5,
      patientDeviationThreshold: 8,
      consecutiveDeviationCount: 3,
      autoSuspendEnabled: true,
      navigationSystemUrl: 'http://navigation-system.local/api'
    }
  });

  console.log(`✅ 创建了系统设置`);

  const patients = await prisma.patient.createMany({
    data: [
      {
        medicalRecordNo: 'MR20240001',
        name: '患者A',
        birthDate: new Date('1985-03-15'),
        gender: '男',
        diagnosis: '抑郁症',
        isSuspended: false
      },
      {
        medicalRecordNo: 'MR20240002',
        name: '患者B',
        birthDate: new Date('1978-07-22'),
        gender: '女',
        diagnosis: '强迫症',
        isSuspended: false
      },
      {
        medicalRecordNo: 'MR20240003',
        name: '患者C',
        birthDate: new Date('1992-11-08'),
        gender: '男',
        diagnosis: '精神分裂症',
        isSuspended: false
      },
      {
        medicalRecordNo: 'MR20240004',
        name: '患者D',
        birthDate: new Date('1965-01-30'),
        gender: '女',
        diagnosis: '帕金森病',
        isSuspended: false
      },
      {
        medicalRecordNo: 'MR20240005',
        name: '患者E',
        birthDate: new Date('1988-09-12'),
        gender: '男',
        diagnosis: '癫痫',
        isSuspended: false
      }
    ],
    skipDuplicates: true
  });

  console.log(`✅ 创建了 ${patients.count} 个患者`);

  console.log('🎉 数据库种子数据初始化完成！');
  console.log('');
  console.log('📋 默认账户：');
  console.log('   管理员: admin / password123');
  console.log('   工程师: engineer1 / password123');
  console.log('   主任: director1 / password123');
  console.log('   专家: expert1 / password123');
  console.log('   首席科学家: scientist1 / password123');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
