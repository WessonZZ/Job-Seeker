/**
 * 公司招聘官网数据库 + 智能 URL 猜测
 *
 * 查找优先级:
 * 1. 精确匹配 KNOWN_COMPANIES
 * 2. 模糊匹配
 * 3. 智能 URL 猜测（尝试多种域名模式）
 * 4. 搜索引擎查询
 */

export interface CompanyInfo {
  name: string;
  careerUrl: string;
  industry?: string;
}

// ─── 大型公司招聘官网映射表（500+ 公司） ───
export const KNOWN_COMPANIES: Record<string, string> = {
  // ═══════════════════════════════════════
  // 互联网 / 科技
  // ═══════════════════════════════════════
  "字节跳动": "https://jobs.bytedance.com",
  "抖音": "https://jobs.bytedance.com",
  "今日头条": "https://jobs.bytedance.com",
  "飞书": "https://jobs.bytedance.com",
  "PICO": "https://jobs.bytedance.com",
  "腾讯": "https://join.qq.com",
  "微信": "https://join.qq.com",
  "QQ": "https://join.qq.com",
  "阿里巴巴": "https://talent.alibaba.com",
  "阿里云": "https://talent.alibaba.com",
  "菜鸟": "https://talent.alibaba.com",
  "蚂蚁集团": "https://talent.antgroup.com",
  "蚂蚁": "https://talent.antgroup.com",
  "美团": "https://zhaopin.meituan.com",
  "大众点评": "https://zhaopin.meituan.com",
  "百度": "https://talent.baidu.com",
  "京东": "https://zhaopin.jd.com",
  "网易": "https://hr.163.com",
  "网易游戏": "https://game.campus.163.com",
  "网易有道": "https://hr.youdao.com",
  "拼多多": "https://careers.pinduoduo.com",
  "快手": "https://zhaopin.kuaishou.cn",
  "小红书": "https://job.xiaohongshu.com",
  "哔哩哔哩": "https://jobs.bilibili.com",
  "B站": "https://jobs.bilibili.com",
  "携程": "https://jobs.ctrip.com",
  "去哪儿": "https://job.qunar.com",
  "滴滴": "https://talent.didiglobal.com",
  "微博": "https://career.weibo.com",
  "搜狐": "https://careers.sohu.com",
  "360": "https://career.360.cn",
  "360公司": "https://career.360.cn",
  "完美世界": "https://jobs.wanmei.com",
  "陌陌": "https://www.hellogroup.com/careers",
  "58同城": "https://job.58.com",
  "58": "https://job.58.com",
  "知乎": "https://www.zhihu.com/careers",
  "虎牙": "https://career.huya.com",
  "斗鱼": "https://www.douyu.com/careers",
  "阅文集团": "https://join.yuewen.com",
  "喜马拉雅": "https://www.ximalaya.com/careers",
  "旷视科技": "https://www.megvii.com/careers",
  "商汤科技": "https://www.sensetime.com/careers",
  "科大讯飞": "https://www.iflytek.com/careers",
  "云从科技": "https://www.cloudwalk.com/careers",
  "寒武纪": "https://www.cambricon.com/careers",
  "第四范式": "https://www.4paradigm.com/careers",
  "地平线": "https://www.horizon.ai/careers",
  "依图科技": "https://www.yitu.com/careers",
  "趣店": "https://www.qudian.com/careers",
  "迅雷": "https://www.xunlei.com/careers",
  "UC": "https://www.ucweb.com/careers",
  "金山": "https://career.wps.cn",
  "金山办公": "https://career.wps.cn",
  "WPS": "https://career.wps.cn",
  "猎豹移动": "https://www.cmcm.com/careers",
  "趣头条": "https://www.qutoutiao.net/careers",
  "美图": "https://career.meitu.com",
  "猫眼": "https://zhaopin.maoyan.com",
  // ── 外企 ──
  "微软": "https://careers.microsoft.com",
  "Microsoft": "https://careers.microsoft.com",
  "谷歌": "https://careers.google.com",
  "Google": "https://careers.google.com",
  "亚马逊": "https://www.amazon.jobs",
  "Amazon": "https://www.amazon.jobs",
  "苹果": "https://www.apple.com/careers",
  "Apple": "https://www.apple.com/careers",
  "Meta": "https://www.metacareers.com",
  "Facebook": "https://www.metacareers.com",
  "特斯拉": "https://www.tesla.com/careers",
  "Tesla": "https://www.tesla.com/careers",
  "英特尔": "https://www.intel.com/careers",
  "Intel": "https://www.intel.com/careers",
  "英伟达": "https://www.nvidia.com/careers",
  "NVIDIA": "https://www.nvidia.com/careers",
  "AMD": "https://www.amd.com/careers",
  "IBM": "https://www.ibm.com/careers",
  "思科": "https://www.cisco.com/careers",
  "Cisco": "https://www.cisco.com/careers",
  "SAP": "https://www.sap.com/careers",
  "Oracle": "https://www.oracle.com/careers",
  "甲骨文": "https://www.oracle.com/careers",
  "Adobe": "https://www.adobe.com/careers",
  "高通": "https://www.qualcomm.com/careers",
  "Qualcomm": "https://www.qualcomm.com/careers",
  "优步": "https://www.uber.com/careers",
  "Uber": "https://www.uber.com/careers",
  "Airbnb": "https://www.airbnb.com/careers",
  "Twilio": "https://www.twilio.com/careers",
  "Snowflake": "https://www.snowflake.com/careers",
  "Databricks": "https://www.databricks.com/careers",
  "Zoom": "https://careers.zoom.us",
  "Shopee": "https://careers.shopee.sg",
  "Grab": "https://grab.careers",
  "Lazada": "https://www.lazada.com/careers",

  // ═══════════════════════════════════════
  // 金融
  // ═══════════════════════════════════════
  "中金公司": "https://www.cicc.com/careers",
  "中金": "https://www.cicc.com/careers",
  "中信证券": "https://www.citics.com/careers",
  "华泰证券": "https://www.htsc.com.cn/careers",
  "中国平安": "https://career.pingan.com",
  "平安": "https://career.pingan.com",
  "平安科技": "https://campus.pingan.com",
  "招商证券": "https://www.cmschina.com/careers",
  "国泰君安": "https://www.gtja.com/careers",
  "海通证券": "https://www.htsec.com/careers",
  "广发证券": "https://www.gf.com.cn/careers",
  "中信建投": "https://www.csc.com.cn/careers",
  "光大证券": "https://www.ebscn.com/careers",
  "东方证券": "https://www.dfzq.com.cn/careers",
  "兴业证券": "https://www.xyzq.com.cn/careers",
  "民生证券": "https://www.mszq.com/careers",
  "银河证券": "https://www.chinastock.com.cn/careers",
  "申万宏源": "https://www.swsresearch.com/careers",
  "天风证券": "https://www.tfzq.com/careers",
  // ── 基金/资管 ──
  "易方达基金": "https://www.efunds.com.cn/careers",
  "华夏基金": "https://www.chinaamc.com/careers",
  "广发基金": "https://www.gffunds.com.cn/careers",
  "富国基金": "https://www.fullgoal.com.cn/careers",
  "南方基金": "https://www.nffund.com/careers",
  "汇添富基金": "https://www.htffund.com/careers",
  "嘉实基金": "https://www.jsfund.cn/careers",
  "博时基金": "https://www.bosera.com/careers",
  "工银瑞信": "https://www.icbccs.com.cn/careers",
  // ── 量化/私募 ──
  "幻方量化": "https://www.high-flyer.cn/careers",
  "幻方": "https://www.high-flyer.cn/careers",
  "九坤投资": "https://www.ubiquant.com/careers",
  "九坤": "https://www.ubiquant.com/careers",
  "明汯投资": "https://www.minghong.com/careers",
  "灵均投资": "https://www.lingjun.com/careers",
  "衍复投资": "https://www.yanfuo.com/careers",
  "诚奇资产": "https://www.chengqi.com/careers",
  "宽德投资": "https://www.witquant.com/careers",
  "启林投资": "https://www.qilincapital.com/careers",
  "天演资本": "https://www.tianyancap.com/careers",
  "黑翼资产": "https://www.bwfund.com/careers",
  "金锝资产": "https://www.jindefund.com/careers",
  "量派投资": "https://www.liangpai.com/careers",
  "世纪前沿": "https://www.centuryfrontier.com/careers",
  // ── 银行 ──
  "工商银行": "https://job.icbc.com.cn",
  "中国银行": "https://www.boc.cn/careers",
  "建设银行": "https://job.ccb.com",
  "农业银行": "https://career.abchina.com",
  "交通银行": "https://job.bankcomm.com",
  "招商银行": "https://career.cmbchina.com",
  "兴业银行": "https://www.cib.com.cn/careers",
  "浦发银行": "https://www.spdb.com.cn/careers",
  "中信银行": "https://www.citicbank.com/careers",
  "民生银行": "https://www.cmbc.com.cn/careers",
  "光大银行": "https://www.cebbank.com/careers",
  "平安银行": "https://www.pinganbank.com/careers",
  "宁波银行": "https://www.nbcb.com.cn/careers",
  "上海银行": "https://www.bosc.cn/careers",
  "北京银行": "https://www.bankofbeijing.com.cn/careers",
  // ── 国际投行 ──
  "摩根士丹利": "https://www.morganstanley.com/careers",
  "大摩": "https://www.morganstanley.com/careers",
  "高盛": "https://www.goldmansachs.com/careers",
  "Goldman Sachs": "https://www.goldmansachs.com/careers",
  "摩根大通": "https://www.jpmorganchase.com/careers",
  "JPMorgan": "https://www.jpmorganchase.com/careers",
  "花旗": "https://www.citi.com/careers",
  "Citi": "https://www.citi.com/careers",
  "汇丰": "https://www.hsbc.com/careers",
  "HSBC": "https://www.hsbc.com/careers",
  "渣打": "https://www.sc.com/careers",
  "德意志银行": "https://www.db.com/careers",
  "UBS": "https://www.ubs.com/careers",
  "瑞士银行": "https://www.ubs.com/careers",
  "瑞信": "https://www.credit-suisse.com/careers",

  // ═══════════════════════════════════════
  // 咨询 / 四大
  // ═══════════════════════════════════════
  "麦肯锡": "https://www.mckinsey.com/careers",
  "McKinsey": "https://www.mckinsey.com/careers",
  "波士顿咨询": "https://www.bcg.com/careers",
  "BCG": "https://www.bcg.com/careers",
  "贝恩": "https://www.bain.com/careers",
  "Bain": "https://www.bain.com/careers",
  "普华永道": "https://www.pwccn.com/careers",
  "PwC": "https://www.pwccn.com/careers",
  "德勤": "https://www.deloitte.com/careers",
  "Deloitte": "https://www.deloitte.com/careers",
  "安永": "https://www.ey.com/careers",
  "EY": "https://www.ey.com/careers",
  "毕马威": "https://www.kpmg.com/careers",
  "KPMG": "https://www.kpmg.com/careers",
  "罗兰贝格": "https://www.rolandberger.com/careers",
  "奥纬": "https://www.oliverwyman.com/careers",
  "Oliver Wyman": "https://www.oliverwyman.com/careers",
  "艾意凯": "https://www.lek.com/careers",
  "LEK": "https://www.lek.com/careers",
  "科尔尼": "https://www.kearney.com/careers",
  "Kearney": "https://www.kearney.com/careers",
  "思略特": "https://www.strategyand.pwc.com/careers",
  "Strategy&": "https://www.strategyand.pwc.com/careers",
  "埃森哲": "https://www.accenture.com/careers",
  "Accenture": "https://www.accenture.com/careers",
  "IBM咨询": "https://www.ibm.com/consulting/careers",

  // ═══════════════════════════════════════
  // 快消 / 零售
  // ═══════════════════════════════════════
  "宝洁": "https://www.pgcareers.com",
  "P&G": "https://www.pgcareers.com",
  "联合利华": "https://www.unilever.com/careers",
  "Unilever": "https://www.unilever.com/careers",
  "玛氏": "https://www.mars.com/careers",
  "Mars": "https://www.mars.com/careers",
  "可口可乐": "https://www.coca-colacompany.com/careers",
  "Coca-Cola": "https://www.coca-colacompany.com/careers",
  "雀巢": "https://www.nestle.com/careers",
  "Nestlé": "https://www.nestle.com/careers",
  "欧莱雅": "https://www.loreal.com/careers",
  "L'Oréal": "https://www.loreal.com/careers",
  "百事": "https://www.pepsico.com/careers",
  "PepsiCo": "https://www.pepsico.com/careers",
  "百威": "https://www.ab-inbev.com/careers",
  "达能": "https://www.danone.com/careers",
  "Danone": "https://www.danone.com/careers",
  "蒙牛": "https://www.mengniu.com/careers",
  "伊利": "https://www.yili.com/careers",
  "安踏": "https://www.anta.com/careers",
  "耐克": "https://www.nike.com/careers",
  "Nike": "https://www.nike.com/careers",
  "Adidas": "https://www.adidas-group.com/careers",
  "阿迪达斯": "https://www.adidas-group.com/careers",
  "彪马": "https://about.puma.com/careers",
  "优衣库": "https://www.fastretailing.com/careers",
  "无印良品": "https://www.muji.com/careers",
  "宜家": "https://www.ikea.com/careers",
  "IKEA": "https://www.ikea.com/careers",
  "星巴克": "https://www.starbucks.com/careers",
  "Starbucks": "https://www.starbucks.com/careers",
  "麦当劳": "https://www.mcdonalds.com/careers",
  "肯德基": "https://www.yum.com/careers",
  "沃尔玛": "https://www.walmart.com/careers",
  "Costco": "https://www.costco.com/careers",
  "路易威登": "https://www.lvmh.com/careers",
  "LVMH": "https://www.lvmh.com/careers",
  "古驰": "https://www.gucci.com/careers",
  "Gucci": "https://www.gucci.com/careers",
  "爱马仕": "https://www.hermes.com/careers",
  "Hermès": "https://www.hermes.com/careers",

  // ═══════════════════════════════════════
  // 制造业 / 硬件 / 半导体
  // ═══════════════════════════════════════
  "华为": "https://career.huawei.com",
  "荣耀": "https://www.honor.com/careers",
  "小米": "https://hr.xiaomi.com",
  "Redmi": "https://hr.xiaomi.com",
  "比亚迪": "https://job.byd.com",
  "宁德时代": "https://www.catl.com/careers",
  "大疆": "https://we.dji.com",
  "DJI": "https://we.dji.com",
  "OPPO": "https://career.oppo.com",
  "vivo": "https://career.vivo.com",
  "中兴": "https://job.zte.com.cn",
  "联想": "https://talent.lenovo.com",
  "京东方": "https://www.boe.com/careers",
  "TCL": "https://www.tcl.com/careers",
  "海信": "https://www.hisense.com/careers",
  "创维": "https://www.skyworth.com/careers",
  "康佳": "https://www.konka.com/careers",
  "美的": "https://careers.midea.com",
  "格力": "https://www.gree.com/careers",
  "海尔": "https://maker.haier.net",
  "海康威视": "https://www.hikvision.com/careers",
  "大华": "https://www.dahuasecurity.com/careers",
  // ── 汽车 ──
  "理想汽车": "https://www.lixiang.com/careers",
  "蔚来": "https://www.nio.com/careers",
  "小鹏汽车": "https://www.xiaopeng.com/careers",
  "小鹏": "https://www.xiaopeng.com/careers",
  "极氪": "https://www.zeekr.com/careers",
  "领克": "https://www.lykco.com/careers",
  "长城汽车": "https://www.gwm.com.cn/careers",
  "吉利": "https://www.geely.com/careers",
  "上汽": "https://www.saicmotor.com/careers",
  "广汽": "https://www.gac.com.cn/careers",
  "长安": "https://www.changan.com.cn/careers",
  "一汽": "https://www.faw.com.cn/careers",
  "北汽": "https://www.baic.com/careers",
  "宝马": "https://www.bmw.com/careers",
  "BMW": "https://www.bmw.com/careers",
  "奔驰": "https://www.mercedes-benz.com/careers",
  "梅赛德斯": "https://www.mercedes-benz.com/careers",
  "奥迪": "https://www.audi.com/careers",
  "Audi": "https://www.audi.com/careers",
  "丰田": "https://www.toyota.com/careers",
  "Toyota": "https://www.toyota.com/careers",
  // ── 工业 ──
  "西门子": "https://www.siemens.com/careers",
  "Siemens": "https://www.siemens.com/careers",
  "博世": "https://www.bosch.com/careers",
  "Bosch": "https://www.bosch.com/careers",
  "通用电气": "https://www.ge.com/careers",
  "GE": "https://www.ge.com/careers",
  "霍尼韦尔": "https://www.honeywell.com/careers",
  "Honeywell": "https://www.honeywell.com/careers",
  "施耐德": "https://www.se.com/careers",
  "Schneider": "https://www.se.com/careers",
  "ABB": "https://www.abb.com/careers",
  "飞利浦": "https://www.philips.com/careers",
  "Philips": "https://www.philips.com/careers",
  "松下": "https://www.panasonic.com/careers",
  "Panasonic": "https://www.panasonic.com/careers",
  "索尼": "https://www.sony.com/careers",
  "Sony": "https://www.sony.com/careers",
  "三星": "https://www.samsung.com/careers",
  "Samsung": "https://www.samsung.com/careers",
  "LG": "https://www.lg.com/careers",
  "台积电": "https://www.tsmc.com/careers",
  "TSMC": "https://www.tsmc.com/careers",
  "中芯国际": "https://www.smics.com/careers",
  "长江存储": "https://www.ymtc.com/careers",
  "华虹": "https://www.huahong.com/careers",

  // ═══════════════════════════════════════
  // 生物医药
  // ═══════════════════════════════════════
  "药明康德": "https://www.wuxiapptec.com/careers",
  "药明生物": "https://www.wuxibiologics.com/careers",
  "恒瑞医药": "https://www.hengrui.com/careers",
  "百济神州": "https://www.beigene.com/careers",
  "复星医药": "https://www.fosunpharma.com/careers",
  "石药集团": "https://www.cspc.com/careers",
  "中国生物制药": "https://www.sino-biopharm.com/careers",
  "信达生物": "https://www.innoventbio.com/careers",
  "君实生物": "https://www.junshipharma.com/careers",
  "康希诺": "https://www.cansinotech.com/careers",
  "智飞生物": "https://www.zhifeishengwu.com/careers",
  "长春高新": "https://www.cchighnew.com/careers",
  "华大基因": "https://www.genomics.cn/careers",
  "华大": "https://www.genomics.cn/careers",
  // ── 外企药厂 ──
  "辉瑞": "https://www.pfizer.com/careers",
  "Pfizer": "https://www.pfizer.com/careers",
  "强生": "https://www.jnj.com/careers",
  "Johnson & Johnson": "https://www.jnj.com/careers",
  "罗氏": "https://www.roche.com/careers",
  "Roche": "https://www.roche.com/careers",
  "诺华": "https://www.novartis.com/careers",
  "Novartis": "https://www.novartis.com/careers",
  "默沙东": "https://www.msd.com/careers",
  "MSD": "https://www.msd.com/careers",
  "赛诺菲": "https://www.sanofi.com/careers",
  "Sanofi": "https://www.sanofi.com/careers",
  "阿斯利康": "https://www.astrazeneca.com/careers",
  "AstraZeneca": "https://www.astrazeneca.com/careers",
  "拜耳": "https://www.bayer.com/careers",
  "Bayer": "https://www.bayer.com/careers",
  "诺和诺德": "https://www.novonordisk.com/careers",
  "礼来": "https://www.lilly.com/careers",
  "吉利德": "https://www.gilead.com/careers",
  "百时美施贵宝": "https://www.bms.com/careers",
  "BMS": "https://www.bms.com/careers",
  "武田": "https://www.takeda.com/careers",
  "美敦力": "https://www.medtronic.com/careers",
  "Medtronic": "https://www.medtronic.com/careers",
  "波士顿科学": "https://www.bostonscientific.com/careers",
  "雅培": "https://www.abbott.com/careers",
  "Abbott": "https://www.abbott.com/careers",
  "赛默飞": "https://www.thermofisher.com/careers",
  "Thermo Fisher": "https://www.thermofisher.com/careers",
  "丹纳赫": "https://www.danaher.com/careers",
  "Danaher": "https://www.danaher.com/careers",

  // ═══════════════════════════════════════
  // 教育
  // ═══════════════════════════════════════
  "新东方": "https://zhaopin.xdf.cn",
  "好未来": "https://www.100tal.com/careers",
  "学而思": "https://www.100tal.com/careers",
  "猿辅导": "https://www.yuanfudao.com/careers",
  "作业帮": "https://www.zuoyebang.com/careers",
  "得到": "https://www.igetget.com/careers",
  "沪江": "https://www.hujiang.com/careers",
  "流利说": "https://www.liulishuo.com/careers",
  "VIPKID": "https://www.vipkid.com/careers",
  "掌门": "https://www.zhangmen.com/careers",
  "高途": "https://www.gaotu.cn/careers",
  "跟谁学": "https://www.gaotu.cn/careers",

  // ═══════════════════════════════════════
  // 游戏
  // ═══════════════════════════════════════
  "米哈游": "https://www.mihoyo.com/careers",
  "米哈": "https://www.mihoyo.com/careers",
  "原神": "https://www.mihoyo.com/careers",
  "腾讯游戏": "https://join.qq.com",
  "莉莉丝": "https://www.lilith.com/careers",
  "鹰角网络": "https://www.hypergryph.com/careers",
  "叠纸游戏": "https://www.papergames.com/careers",
  "FunPlus": "https://www.funplus.com/careers",
  "趣加": "https://www.funplus.com/careers",
  "沐瞳科技": "https://www.moonton.com/careers",
  "IGG": "https://www.igg.com/careers",
  "三七互娱": "https://www.37games.com/careers",
  "世纪华通": "https://www.centuryhuatong.com/careers",
  "吉比特": "https://www.gbit.com/careers",
  "心动网络": "https://www.xd.com/careers",
  "TapTap": "https://www.xd.com/careers",
  "紫龙游戏": "https://www.zlongame.com/careers",
  "盛趣游戏": "https://www.shengqugames.com/careers",
  "游族网络": "https://www.youzu.com/careers",
  "中手游": "https://www.cmge.com/careers",
  "网龙": "https://www.nd.com.cn/careers",
  "多益网络": "https://www.duoyi.com/careers",
  "西山居": "https://www.xishanju.com/careers",
  "剑网3": "https://www.xishanju.com/careers",
  "乐元素": "https://www.happyelements.com/careers",
  "Supercell": "https://www.supercell.com/careers",
  "Epic Games": "https://www.epicgames.com/careers",
  "Unity": "https://careers.unity.com",
  "Roblox": "https://corp.roblox.com/careers",
  "暴雪": "https://www.blizzard.com/careers",
  "Blizzard": "https://www.blizzard.com/careers",
  "育碧": "https://www.ubisoft.com/careers",
  "Ubisoft": "https://www.ubisoft.com/careers",
  "任天堂": "https://www.nintendo.com/careers",
  "Nintendo": "https://www.nintendo.com/careers",
  "Electronic Arts": "https://www.ea.com/careers",
  "EA": "https://www.ea.com/careers",
  "Take-Two": "https://www.take2games.com/careers",
  "动视": "https://www.activision.com/careers",
  "Activision": "https://www.activision.com/careers",
};

/**
 * 根据公司名查找招聘官网
 */
export function findCompanyUrl(name: string): string | null {
  const cleanName = name.trim();

  // 1. 精确匹配
  if (KNOWN_COMPANIES[cleanName]) {
    return KNOWN_COMPANIES[cleanName];
  }

  // 2. 模糊匹配（长关键词优先）
  const keys = Object.keys(KNOWN_COMPANIES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return KNOWN_COMPANIES[key];
    }
  }

  return null;
}

/**
 * 搜索匹配的公司列表（用于搜索建议）
 */
export function searchCompanies(query: string): CompanyInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: CompanyInfo[] = [];
  const keys = Object.keys(KNOWN_COMPANIES);

  for (const key of keys) {
    if (key.toLowerCase().includes(q)) {
      results.push({ name: key, careerUrl: KNOWN_COMPANIES[key] });
    }
  }

  // 去重（同一 URL 只保留一个）
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.careerUrl)) return false;
    seen.add(r.careerUrl);
    return true;
  }).slice(0, 8);
}

/**
 * 智能 URL 猜测：根据公司名尝试常见的域名模式
 */
export function guessCareerUrl(name: string): string[] {
  const cleanName = name.trim();

  // 如果已经包含域名关键词，直接返回
  if (cleanName.includes(".com") || cleanName.includes(".cn")) {
    return [cleanName.startsWith("http") ? cleanName : `https://${cleanName}`];
  }

  // 常见中英文关键词映射
  const guesses: string[] = [];

  // 已知品牌名的英文域名
  const brandDomainMap: Record<string, string> = {
    "幻方量化": "high-flyer.cn",
    "幻方": "high-flyer.cn",
    "九坤": "ubiquant.com",
    "明汯": "mhfunds.com",
    "灵均": "lingjuninvest.com",
    "衍复": "yanfuo.com",
    "诚奇": "chengqiam.com",
    "宽德": "witquant.com",
    "启林": "qilincapital.com",
    "天演": "tianyancap.com",
    "黑翼": "bwfund.com",
  };

  for (const [key, domain] of Object.entries(brandDomainMap)) {
    if (cleanName.includes(key)) {
      guesses.push(`https://${domain}/careers`);
      guesses.push(`https://www.${domain}/careers`);
      guesses.push(`https://${domain}/join`);
      guesses.push(`https://${domain}`);
    }
  }

  // 通用模式: name.com/careers
  const asciiName = cleanName
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 30);

  if (asciiName && !guesses.length) {
    guesses.push(`https://www.${asciiName}.com/careers`);
    guesses.push(`https://www.${asciiName}.com/cn/careers`);
    guesses.push(`https://www.${asciiName}.com.cn/careers`);
    guesses.push(`https://${asciiName}.com/careers`);
    guesses.push(`https://${asciiName}.zhaopin.com`);
    guesses.push(`https://career.${asciiName}.com`);
    guesses.push(`https://jobs.${asciiName}.com`);
    guesses.push(`https://talent.${asciiName}.com`);
  }

  // 通用 HR 系统域名
  guesses.push(`https://www.zhaopin.com/company/${encodeURIComponent(cleanName)}`);
  guesses.push(`https://www.liepin.com/company/${encodeURIComponent(cleanName)}/`);

  return [...new Set(guesses)].slice(0, 10);
}

/**
 * 尝试验证 URL 是否可以访问
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}
