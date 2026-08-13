import { PrismaClient } from "@prisma/client";
import { generateSlug } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  // ── 行业数据（幂等：已存在则跳过） ──
  const industryData = [
    { name: "互联网/科技", slug: "tech", description: "互联网、软件、AI、云计算、电商等科技企业", icon: "💻" },
    { name: "金融", slug: "finance", description: "银行、证券、保险、基金、金融科技", icon: "💰" },
    { name: "咨询/四大", slug: "consulting", description: "管理咨询、战略咨询、会计师事务所", icon: "📊" },
    { name: "快消/零售", slug: "fmcg", description: "快消品、零售、电商平台", icon: "🛍️" },
    { name: "制造业/硬件", slug: "manufacturing", description: "消费电子、半导体、汽车、新能源", icon: "🔧" },
    { name: "生物医药", slug: "biomed", description: "制药、生物技术、医疗器械", icon: "💊" },
    { name: "教育", slug: "education", description: "高等教育、在线教育、培训", icon: "📚" },
  ];

  const industries = new Map<string, { id: string; name: string }>();

  for (const ind of industryData) {
    const existing = await prisma.industry.findUnique({ where: { slug: ind.slug } });
    if (existing) {
      industries.set(ind.slug, existing);
    } else {
      const created = await prisma.industry.create({ data: ind });
      industries.set(ind.slug, created);
    }
  }

  // ── 公司数据 ──
  const companyData: Array<{
    industrySlug: string;
    name: string;
    website: string;
    description: string;
  }> = [
    // ── 互联网/科技 ──
    { industrySlug: "tech", name: "字节跳动", website: "https://jobs.bytedance.com", description: "全球化科技公司，旗下产品包括抖音/TikTok、今日头条等" },
    { industrySlug: "tech", name: "腾讯", website: "https://join.qq.com", description: "世界领先的互联网科技公司，覆盖社交、游戏、金融科技等" },
    { industrySlug: "tech", name: "阿里巴巴", website: "https://talent.alibaba.com", description: "业务涵盖电商、云计算、数字媒体与娱乐等领域" },
    { industrySlug: "tech", name: "美团", website: "https://zhaopin.meituan.com", description: "中国领先的生活服务电子商务平台" },
    { industrySlug: "tech", name: "百度", website: "https://talent.baidu.com", description: "全球最大的中文搜索引擎，致力于人工智能领域" },
    { industrySlug: "tech", name: "京东", website: "https://zhaopin.jd.com", description: "中国领先的技术驱动型电商公司" },
    { industrySlug: "tech", name: "网易", website: "https://hr.163.com", description: "中国领先的互联网技术公司，业务涵盖游戏、音乐、教育等" },
    { industrySlug: "tech", name: "拼多多", website: "https://careers.pinduoduo.com", description: "国内领先的移动电商平台" },
    { industrySlug: "tech", name: "快手", website: "https://zhaopin.kuaishou.cn", description: "领先的内容社区和社交平台" },
    { industrySlug: "tech", name: "小红书", website: "https://job.xiaohongshu.com", description: "年轻人的生活方式平台" },
    { industrySlug: "tech", name: "哔哩哔哩", website: "https://jobs.bilibili.com", description: "中国年轻世代高度聚集的文化社区和视频平台" },
    { industrySlug: "tech", name: "携程", website: "https://jobs.ctrip.com", description: "中国领先的在线旅行服务公司" },
    { industrySlug: "tech", name: "微软", website: "https://careers.microsoft.com", description: "全球领先的软件、服务、设备和解决方案提供商" },
    { industrySlug: "tech", name: "谷歌", website: "https://careers.google.com", description: "全球最大的搜索引擎公司" },

    // ── 金融 ──
    { industrySlug: "finance", name: "中金公司", website: "https://www.cicc.com", description: "中国领先的投资银行" },
    { industrySlug: "finance", name: "蚂蚁集团", website: "https://talent.antgroup.com", description: "领先的金融科技公司" },
    { industrySlug: "finance", name: "中国平安", website: "https://career.pingan.com", description: "综合金融保险集团" },
    { industrySlug: "finance", name: "中信证券", website: "https://www.citics.com", description: "中国领先的证券公司" },
    { industrySlug: "finance", name: "华泰证券", website: "https://www.htsc.com.cn", description: "综合性证券集团" },
    { industrySlug: "finance", name: "摩根士丹利", website: "https://www.morganstanley.com", description: "全球领先的国际金融服务公司" },
    { industrySlug: "finance", name: "高盛", website: "https://www.goldmansachs.com", description: "全球领先的投资银行" },

    // ── 咨询/四大 ──
    { industrySlug: "consulting", name: "麦肯锡", website: "https://www.mckinsey.com/careers", description: "全球领先的管理咨询公司" },
    { industrySlug: "consulting", name: "波士顿咨询", website: "https://www.bcg.com/careers", description: "全球著名的管理咨询公司" },
    { industrySlug: "consulting", name: "贝恩", website: "https://www.bain.com/careers", description: "全球领先的战略咨询公司" },
    { industrySlug: "consulting", name: "普华永道", website: "https://www.pwccn.com/careers", description: "全球最大的专业服务机构之一" },
    { industrySlug: "consulting", name: "德勤", website: "https://www.deloitte.com/careers", description: "全球领先的专业服务机构" },
    { industrySlug: "consulting", name: "安永", website: "https://www.ey.com/careers", description: "全球领先的审计、税务、交易和咨询服务机构" },
    { industrySlug: "consulting", name: "毕马威", website: "https://www.kpmg.com/careers", description: "国际四大会计师事务所之一" },

    // ── 快消/零售 ──
    { industrySlug: "fmcg", name: "宝洁", website: "https://www.pgcareers.com", description: "全球最大的日用消费品公司之一" },
    { industrySlug: "fmcg", name: "联合利华", website: "https://www.unilever.com/careers", description: "全球领先的食品、家庭和个人护理用品公司" },
    { industrySlug: "fmcg", name: "玛氏", website: "https://www.mars.com/careers", description: "全球最大的食品生产企业之一" },
    { industrySlug: "fmcg", name: "可口可乐", website: "https://www.coca-cola.com/careers", description: "全球最大的饮料公司" },
    { industrySlug: "fmcg", name: "雀巢", website: "https://www.nestle.com/careers", description: "全球最大的食品和饮料公司" },
    { industrySlug: "fmcg", name: "欧莱雅", website: "https://www.loreal.com/careers", description: "全球最大的化妆品集团" },

    // ── 制造业/硬件 ──
    { industrySlug: "manufacturing", name: "华为", website: "https://career.huawei.com", description: "全球领先的 ICT 基础设施和智能终端提供商" },
    { industrySlug: "manufacturing", name: "小米", website: "https://hr.xiaomi.com", description: "全球领先的消费电子及智能制造公司" },
    { industrySlug: "manufacturing", name: "比亚迪", website: "https://job.byd.com", description: "全球领先的新能源汽车和动力电池制造商" },
    { industrySlug: "manufacturing", name: "宁德时代", website: "https://www.catl.com/careers", description: "全球领先的动力电池系统提供商" },
    { industrySlug: "manufacturing", name: "大疆", website: "https://we.dji.com", description: "全球领先的无人机和影像系统制造商" },
    { industrySlug: "manufacturing", name: "特斯拉", website: "https://www.tesla.com/careers", description: "全球领先的电动汽车和清洁能源公司" },
    { industrySlug: "manufacturing", name: "理想汽车", website: "https://www.lixiang.com/careers", description: "中国领先的新能源汽车制造商" },
    { industrySlug: "manufacturing", name: "蔚来", website: "https://www.nio.com/careers", description: "全球化的智能电动汽车公司" },
    { industrySlug: "manufacturing", name: "西门子", website: "https://www.siemens.com/careers", description: "全球领先的工业自动化和数字化公司" },
    { industrySlug: "manufacturing", name: "博世", website: "https://www.bosch.com/careers", description: "全球领先的技术和服务供应商" },
    { industrySlug: "manufacturing", name: "英伟达", website: "https://www.nvidia.com/careers", description: "全球领先的 GPU 和 AI 计算公司" },
    { industrySlug: "manufacturing", name: "英特尔", website: "https://www.intel.com/careers", description: "全球最大的半导体芯片制造商" },

    // ── 生物医药 ──
    { industrySlug: "biomed", name: "药明康德", website: "https://www.wuxiapptec.com/careers", description: "全球领先的医药研发服务平台" },
    { industrySlug: "biomed", name: "恒瑞医药", website: "https://www.hengrui.com/careers", description: "中国领先的创新药研发企业" },
    { industrySlug: "biomed", name: "百济神州", website: "https://www.beigene.com/careers", description: "全球化的生物科技公司" },
    { industrySlug: "biomed", name: "复星医药", website: "https://www.fosunpharma.com/careers", description: "领先的医药健康产业集团" },
    { industrySlug: "biomed", name: "辉瑞", website: "https://www.pfizer.com/careers", description: "全球领先的生物制药公司" },
    { industrySlug: "biomed", name: "强生", website: "https://www.jnj.com/careers", description: "全球领先的医疗健康和消费品公司" },

    // ── 教育 ──
    { industrySlug: "education", name: "新东方", website: "https://zhaopin.xdf.cn", description: "中国领先的综合性教育集团" },
    { industrySlug: "education", name: "好未来", website: "https://www.100tal.com/careers", description: "中国领先的科技教育公司" },
    { industrySlug: "education", name: "猿辅导", website: "https://www.yuanfudao.com/careers", description: "中国领先的在线教育公司" },
    { industrySlug: "education", name: "作业帮", website: "https://www.zuoyebang.com/careers", description: "中国领先的在线教育平台" },
  ];

  const createdCompanies: Array<{ id: string; name: string; industrySlug: string }> = [];

  for (const company of companyData) {
    const industry = industries.get(company.industrySlug);
    if (!industry) continue;

    const existing = await prisma.company.findFirst({
      where: { name: company.name },
    });
    if (!existing) {
      const slug = generateSlug(company.name);

      const created = await prisma.company.create({
        data: {
          name: company.name,
          slug,
          industryId: industry.id,
          website: company.website,
          description: company.description,
        },
      });
      createdCompanies.push({ id: created.id, name: created.name, industrySlug: company.industrySlug });
    } else {
      createdCompanies.push({ id: existing.id, name: existing.name, industrySlug: company.industrySlug });
    }
  }

  // ── 岗位数据 ──
  const jobData: Array<{
    companyName: string;
    title: string;
    jd: string;
    salary: string;
    location: string;
    tags: string[];
    daysAgo: number;
  }> = [
    { companyName: "字节跳动", title: "后端开发工程师（2026 届秋招）", jd: "职位描述：\n1. 参与抖音/TikTok 核心后端的架构设计与开发\n2. 负责高并发、高可用系统的设计与优化\n3. 参与微服务架构的演进\n\n任职要求：\n1. 2026 届本科及以上学历，计算机相关专业\n2. 扎实的计算机基础知识\n3. 了解分布式系统原理，有相关项目经验优先", salary: "20k-40k·15薪", location: "北京/上海/深圳", tags: ["2026届", "秋招", "后端"], daysAgo: 0 },
    { companyName: "字节跳动", title: "前端开发工程师（2026 届秋招）", jd: "职位描述：\n1. 负责抖音系产品 Web/Hybrid 前端开发\n2. 参与前端基础设施建设\n3. 优化页面性能和用户体验", salary: "20k-38k·15薪", location: "北京/杭州", tags: ["2026届", "秋招", "前端"], daysAgo: 1 },
    { companyName: "字节跳动", title: "AI 算法工程师（2026 届秋招）", jd: "职位描述：\n1. 从事机器学习/深度学习算法研究与落地\n2. 参与推荐系统、NLP、CV 等方向的核心算法研发", salary: "25k-50k·15薪", location: "北京/上海", tags: ["2026届", "秋招", "算法"], daysAgo: 2 },
    { companyName: "腾讯", title: "软件开发-后台开发方向（2026 届校招）", jd: "职位描述：\n1. 负责腾讯云/微信/QQ 等产品的后台服务开发\n2. 参与大规模分布式系统设计与优化", salary: "18k-35k·16薪", location: "深圳/北京/广州", tags: ["2026届", "校招", "后端"], daysAgo: 0 },
    { companyName: "腾讯", title: "产品策划（2026 届校招）", jd: "职位描述：\n1. 负责产品功能策划与需求文档撰写\n2. 进行用户调研和数据分析", salary: "15k-30k·16薪", location: "深圳/北京", tags: ["2026届", "校招", "产品"], daysAgo: 1 },
    { companyName: "阿里巴巴", title: "研发工程师（2026 届秋招）", jd: "职位描述：\n1. 参与电商核心系统的设计与开发\n2. 负责高并发场景下的系统优化", salary: "18k-36k·16薪", location: "杭州/北京", tags: ["2026届", "秋招", "后端"], daysAgo: 0 },
    { companyName: "阿里巴巴", title: "数据工程师（2026 届秋招）", jd: "职位描述：\n1. 负责大数据平台的建设与维护\n2. 参与数据仓库建设和 ETL 流程优化", salary: "18k-35k·16薪", location: "杭州", tags: ["2026届", "秋招", "数据"], daysAgo: 1 },
    { companyName: "美团", title: "后端开发工程师（2026 届秋招）", jd: "职位描述：\n1. 参与美团核心业务系统开发\n2. 负责高并发、高可用服务的架构设计", salary: "17k-32k·15薪", location: "北京/上海", tags: ["2026届", "秋招", "后端"], daysAgo: 2 },
    { companyName: "百度", title: "AI 研发工程师（2026 届校招）", jd: "职位描述：\n1. 参与文心一言等 AI 产品的研发\n2. 负责大模型训练推理的工程优化", salary: "20k-40k·16薪", location: "北京", tags: ["2026届", "校招", "AI", "算法"], daysAgo: 0 },
    { companyName: "京东", title: "软件开发工程师（2026 届校招）", jd: "职位描述：\n1. 参与京东核心业务系统开发\n2. 负责分布式系统架构设计", salary: "17k-34k·16薪", location: "北京", tags: ["2026届", "校招", "后端"], daysAgo: 1 },
    { companyName: "网易", title: "游戏研发工程师（2026 届校招）", jd: "职位描述：\n1. 参与游戏引擎和工具链开发\n2. 负责游戏逻辑和系统设计", salary: "18k-35k·16薪", location: "广州/杭州", tags: ["2026届", "校招", "游戏"], daysAgo: 2 },
    { companyName: "华为", title: "软件开发工程师（2026 届校招）", jd: "职位描述：\n1. 参与华为云核心组件开发\n2. 负责分布式系统设计和优化", salary: "20k-40k·14薪", location: "深圳/杭州/北京", tags: ["2026届", "校招", "后端"], daysAgo: 0 },
    { companyName: "小米", title: "软件研发工程师（2026 届校招）", jd: "职位描述：\n1. 参与 MIUI 系统应用开发\n2. 负责移动端功能设计和实现", salary: "16k-30k·14薪", location: "北京/南京", tags: ["2026届", "校招", "移动端"], daysAgo: 1 },
    { companyName: "小红书", title: "后端开发工程师（2026 届校招）", jd: "职位描述：\n1. 参与小红书社区后端服务开发\n2. 负责推荐系统的工程落地", salary: "18k-35k·15薪", location: "上海", tags: ["2026届", "校招", "后端"], daysAgo: 1 },
    { companyName: "哔哩哔哩", title: "后端开发工程师（2026 届校招）", jd: "职位描述：\n1. 参与 B 站核心业务系统开发\n2. 负责高并发直播/视频服务的架构优化", salary: "17k-32k·15薪", location: "上海", tags: ["2026届", "校招", "后端"], daysAgo: 2 },
    { companyName: "快手", title: "推荐算法工程师（2026 届校招）", jd: "职位描述：\n1. 参与推荐系统算法研发\n2. 优化 CTR/CVR 预估模型", salary: "22k-45k·16薪", location: "北京", tags: ["2026届", "校招", "算法"], daysAgo: 0 },
    { companyName: "拼多多", title: "服务端研发工程师（2026 届校招）", jd: "职位描述：\n1. 参与电商核心链路研发\n2. 负责高并发系统的架构设计", salary: "20k-40k·16薪", location: "上海", tags: ["2026届", "校招", "后端"], daysAgo: 1 },
    { companyName: "蚂蚁集团", title: "研发工程师（2026 届校招）", jd: "职位描述：\n1. 参与蚂蚁核心支付系统的设计与开发\n2. 负责金融级分布式系统的架构优化", salary: "20k-40k·16薪", location: "杭州/上海", tags: ["2026届", "校招", "后端"], daysAgo: 0 },
    { companyName: "微软", title: "Software Engineer (2026 Campus)", jd: "Responsibilities:\n1. Design and develop software solutions\n2. Collaborate with cross-team partners\n3. Contribute to product improvements", salary: "250k-350k CNY", location: "北京/上海/苏州", tags: ["2026届", "校招", "English"], daysAgo: 1 },
  ];

  for (const job of jobData) {
    const company = createdCompanies.find((c) => c.name === job.companyName);
    if (!company) continue;

    const existing = await prisma.jobPosting.findFirst({
      where: { companyId: company.id, title: job.title },
    });
    if (!existing) {
      const postedDate = new Date();
      postedDate.setDate(postedDate.getDate() - job.daysAgo);
      await prisma.jobPosting.create({
        data: {
          companyId: company.id,
          title: job.title,
          jd: job.jd,
          salary: job.salary,
          location: job.location,
          tags: JSON.stringify(job.tags),
          postedDate,
          isActive: true,
        },
      });
    }
  }

  // ── 示例用户 + 投递记录（仅在无用户时创建） ──
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "张三",
        email: "zhangsan@example.com",
        school: "某某大学",
        major: "计算机科学与技术",
        degree: "硕士",
        graduationYear: 2026,
        summary: "2026 届应届硕士，Java/Go 技术栈，有字节跳动实习经历",
      },
    });

    await prisma.workExperience.create({
      data: {
        userId: user.id,
        company: "字节跳动",
        title: "后端开发实习生",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-06-30"),
        description: "参与抖音电商后端开发，负责订单系统的需求开发和日常维护",
        isCurrent: false,
      },
    });

    // 示例投递
    const byteJob = await prisma.jobPosting.findFirst({
      where: { title: { contains: "后端" }, company: { name: "字节跳动" } },
    });
    if (byteJob) {
      const app1 = await prisma.application.create({
        data: {
          userId: user.id,
          jobPostingId: byteJob.id,
          companyName: "字节跳动",
          position: "后端开发工程师（2026 届秋招）",
          appliedDate: new Date(),
          status: "applied",
          notes: "已投递，等待笔试通知",
          priority: 1,
        },
      });
      await prisma.timelineEvent.create({
        data: { applicationId: app1.id, eventType: "submit", title: "投递简历", description: "通过字节跳动校招官网投递", date: new Date(), isKey: true },
      });
    }

    const tencentJob = await prisma.jobPosting.findFirst({
      where: { title: { contains: "后台" }, company: { name: "腾讯" } },
    });
    if (tencentJob) {
      const app2 = await prisma.application.create({
        data: {
          userId: user.id,
          jobPostingId: tencentJob.id,
          companyName: "腾讯",
          position: "软件开发-后台开发方向（2026 届校招）",
          appliedDate: new Date(Date.now() - 86400000),
          status: "oa",
          notes: "已收到笔试链接",
          priority: 1,
        },
      });
      await prisma.timelineEvent.create({
        data: { applicationId: app2.id, eventType: "submit", title: "投递简历", date: new Date(Date.now() - 86400000), isKey: true },
      });
      await prisma.timelineEvent.create({
        data: { applicationId: app2.id, eventType: "oa", title: "收到笔试通知", description: "在线笔试，时长 120 分钟", date: new Date(), isKey: true },
      });
    }
  }

  const industryCount = await prisma.industry.count();
  const companyCount = await prisma.company.count();
  const currentJobCount = await prisma.jobPosting.count();
  const userCount = await prisma.user.count();
  const appCount = await prisma.application.count();

  console.log("🌱 种子数据同步完成！");
  console.log(`  - ${industryCount} 个行业`);
  console.log(`  - ${companyCount} 家公司`);
  console.log(`  - ${currentJobCount} 个岗位`);
  console.log(`  - ${userCount} 个用户`);
  console.log(`  - ${appCount} 条投递记录`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
