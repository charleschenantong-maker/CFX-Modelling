/* content/93-appendix-d-compliance.js — 附录 D：合规与风险 */
COURSE.register({
  id: "appD",
  part: 9,
  num: "D",
  title: "附录 D · 合规、安全与学术诚信",
  en: "Appendix D — Compliance & Integrity",
  minutes: 20,
  tags: ["附录", "风险", "合规"],
  body: String.raw`
<p class="lead">
  前面十几个模块讲的是<strong>怎么把资源用满</strong>；这一附录讲的是<strong>别把资源用没</strong>。
  两者的性质不同：效率可以慢慢优化，而合规往往只有一次机会——
  一次面向公众的接口暴露、一次 token 进公开仓库、一次被判定为学术不端，代价通常是不可逆的。
  下面每一条都按「能做 / 不能做 / 怎么做才安全」三档来写。
</p>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>先读这一条：这是经验总结，不是条款</h4>
  <p>
    本附录来自工程实践与交流中的<strong>经验总结</strong>，用于建立判断直觉，<strong>不是法律意见</strong>，
    也不是任何平台规则的原文。条款会变、执行尺度会变、地区法律也会变。
    任何涉及付费、账号暴露、数据上传、对外提供服务的决定，动手前请打开对应平台的<strong>最新</strong>
    服务条款与使用政策逐条核对，并把核对的日期写进你的实验日志。
  </p>
</section>

<h3>1. 一把尺子：三个问题</h3>
<p>遇到「这样用行不行」的时刻，先把三件事写下来，比问任何人都快：</p>
<ol>
  <li><strong>流量面向谁？</strong>只有你 → 你自己的内部自动化 → 伙伴与团队 → 不特定公众。越往右越危险。</li>
  <li><strong>用的是谁的账号？</strong>你的个人订阅，还是组织账号。个人账号一旦被判定违规，损失由你一个人承担。</li>
  <li><strong>产出流向哪里？</strong>你自己项目的产物，别人的产品，还是被用来<strong>训练另一个模型</strong>。最后一种性质完全不同。</li>
</ol>
<div class="flow">
  <div class="nd hi">你本人</div><div class="ar">→</div>
  <div class="nd">你的内部自动化</div><div class="ar">→</div>
  <div class="nd">他人用你的凭证</div><div class="ar">→</div>
  <div class="nd">不特定公众 / 转售</div><div class="ar">⇢</div>
  <div class="nd">封号与追责</div>
</div>
<p>
  这条线在几乎所有平台上的形状都一样：<strong>个人订阅的定价前提是「一个人在用人机界面」</strong>。
  一旦你把它变成「一台机器在替很多不特定的人调用模型」，你就从用户变成了服务提供商，
  而服务提供商要签的是另一份合同（按量计费，并附带合规义务）。
</p>

<h3>2. 订阅额度的边界：什么算个人使用，什么算提供服务</h3>
<p>
  先说能做的：<strong>个人订阅用于个人编码与内部自动化，是记录中最常见、也最稳的用法。</strong>
  你写代码、调试、做代码审查、批量整理自己的文档、在 notebook 里分析自己的数据——
  这些都在「一个人用工具完成自己的工作」这个框架内。
  会触发封号的是另一类行为：<strong>把个人订阅的额度接到面向公众的生产流量上</strong>，
  例如对外提供 API 服务、当作网站或 App 的后端、替第三方调用、把额度转售或代充。
</p>
<table class="tbl small">
  <thead><tr><th>场景</th><th>实际调用者</th><th>判断</th><th>风险</th></tr></thead>
  <tbody>
    <tr><td>在本机 IDE 里写代码、重构、生成测试</td><td>你本人</td><td>个人使用，常见做法</td><td>低</td></tr>
    <tr><td>私有仓库的 CI 里自动审阅 PR、生成 changelog</td><td>你的内部自动化</td><td>内部自动化，常见做法</td><td>低</td></tr>
    <tr><td>本地脚本批量整理笔记、改名、生成周报</td><td>你的内部自动化</td><td>内部自动化，常见做法</td><td>低</td></tr>
    <tr><td>Colab / notebook 里做自己的数据分析</td><td>你本人</td><td>个人使用，常见做法</td><td>低</td></tr>
    <tr><td>给同学开的共享机器人，任何人可加入提问</td><td>第三方</td><td>已越界：你在替他人提供模型服务</td><td>中—高</td></tr>
    <tr><td>网站 / App 的后端，访客匿名调用</td><td>不特定公众</td><td>越界：个人额度承载公共流量</td><td>高</td></tr>
    <tr><td>把额度包装成 API 出售、转售、代充</td><td>客户</td><td>越界：商业转售</td><td>极高</td></tr>
    <tr><td>用模型输出批量造数据，训练自己的模型</td><td>你的训练流水线</td><td>越界：蒸馏，另有法律风险</td><td>极高</td></tr>
  </tbody>
</table>
<p>判断标准有三条，按顺序问自己：</p>
<ol>
  <li><strong>流量是否面向不特定公众？</strong>「谁都能用」和「只有我能用」之间没有中间地带。</li>
  <li><strong>是否属于商业转售、或替他人提供模型服务？</strong>免费也照样算：你消耗的是平台的边际成本，换回的是你自己的口碑或流量。</li>
  <li><strong>是否与模型蒸馏相关？</strong>用输出训练竞争模型，几乎所有主流条款都单独禁止，并且平台会专门检测。</li>
</ol>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>平台看到的是什么</h4>
  <p>
    平台判断「你是不是服务提供商」，依据不是你的自我声明，而是<strong>凭证与流量模式</strong>：
    同一个凭证、短时间内来自大量不同终端与地理位置的并发请求、7×24 均匀的调用曲线、机器化的固定间隔——
    这些特征与「一个人在白天用 IDE 写代码」完全不同。
    换句话说，<strong>「我没收费」不构成辩护</strong>：判定标准是使用形态，不是有没有收入。
  </p>
</section>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>请自己核对官方文档</h4>
  <p>
    上面的表是记录中的经验总结，最终<strong>以各平台最新服务条款为准</strong>。至少核对这几处：
  </p>
  <ul>
    <li><a href="https://openai.com/policies/terms-of-use" target="_blank" rel="noopener">OpenAI Terms of Use</a> 与
        <a href="https://openai.com/policies/usage-policies" target="_blank" rel="noopener">Usage Policies</a></li>
    <li><a href="https://www.anthropic.com/legal/consumer-terms" target="_blank" rel="noopener">Anthropic Consumer Terms</a> 与
        <a href="https://www.anthropic.com/legal/aup" target="_blank" rel="noopener">Usage Policy</a></li>
    <li><a href="https://policies.google.com/terms" target="_blank" rel="noopener">Google Terms of Service</a> 与
        <a href="https://policies.google.com/terms/generative-ai/use-policy" target="_blank" rel="noopener">Generative AI Prohibited Use Policy</a></li>
  </ul>
  <p>读的时候重点找三类词：<em>resell</em>（转售）、<em>automated access</em>（自动化访问）、<em>competing model</em>（竞争模型）。</p>
</section>

<h3>3. 数据中心 IP：为什么你的出口会让你连坐</h3>
<p>
  很多自动化一开始跑在云主机上：AWS、Hetzner、DigitalOcean、Vultr。它们的 IP 段有一个共同特征——
  <strong>被大量代理转售服务与蒸馏抓取脚本占用</strong>。于是这些网段在平台的滥用检测里被整体打了低分。
  你被拦的原因往往不是「你做错了什么」，而是<strong>你和滥用者共享了同一个网络指纹</strong>：
  同一个 <span class="t" data-tterm="ASN" data-d="Autonomous System Number，自治系统编号。同一个 ASN 通常对应一个运营商或云厂商，因此可以用来判断 IP 的归属类型。">ASN</span>、相邻的 IP、相似的请求节奏。
</p>
<div class="flow">
  <div class="nd hi">你的请求</div><div class="ar">→</div>
  <div class="nd">出口 IP 归属（云厂商 ASN）</div><div class="ar">→</div>
  <div class="nd">与代理 / 抓取流量聚成簇</div><div class="ar">→</div>
  <div class="nd">评分下降：403 / 429 / 验证码</div>
</div>
<p>
  这是典型的<strong>负外部性</strong>：你无法靠「自己行为端正」把这段关系摘干净。
  把并发从 8 降到 2、把间隔拉长，通常只能减缓——因为降权发生在<strong>网络层</strong>，不在你的请求参数里。
</p>
<p>
  <span class="t" data-tterm="Residential IP gateway" data-d="住宅 IP 网关：让请求从真实 ISP 分配给家庭宽带的地址发出，使出口 IP 的归属类型看起来是住宅网络而不是云机房。">住宅 IP 网关</span>
  的作用，是把出口 IP 的<strong>归属类型</strong>换掉，降低「与同段滥用者连坐」的概率。
  它不是隐身衣：账号身份、设备指纹与行为模式仍会被交叉比对。
  真正决定结果的，通常是<strong>账号与出口的一致性</strong>，而不是出口本身有多干净。
</p>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>多国并发认证：最容易被误判的一种</h4>
  <p>
    同一个账号在短时间内从多个国家、多个 IP 并发完成认证，是风控里最典型的<strong>账号被盗特征</strong>
    （一个人不可能同时出现在三个大洲）。典型后果：强制重新认证、会话被撤销、额度临时冻结、要求人工申诉。
    如果你的自动化恰好分布在多个区域的机器上，请让它们<strong>统一经过一个固定出口</strong>再访问，
    而不是每个区域各自完成认证。
  </p>
</section>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>怎么做才安全</h4>
  <ul>
    <li><strong>一个账号对应一个明确的地理位置与出口。</strong>确实需要换地区时，先正常登录一次并观察是否触发验证。</li>
    <li><strong>出口要固定，不要每次请求都换 IP。</strong>随机轮换比固定更像滥用，出了问题也更难解释。</li>
    <li><strong>把请求摊平</strong>，避免「整点批量」这种机器化曲线。</li>
    <li>给自动化单独的设备与浏览器 profile，与日常使用隔离，出问题时能立刻定位与止损。</li>
    <li>看到 403 / 429 / 验证码时<strong>先停下</strong>检查出口与账号的一致性，不要靠轮换账号「绕过」——
        那会把多个账号绑到同一个可疑模式上，把一次误伤升级成一次违规。</li>
  </ul>
</section>

<h3>4. OAuth 会话与代理：token 就是密码</h3>
<p>
  <span class="t" data-tterm="OAuth token" data-d="OAuth 流程签发的访问凭据，通常包含短期 access token 与长期 refresh token。持有它即可代表你的账号调用接口，无需再次输入密码。">OAuth token</span>
  是<strong>账号凭据</strong>，安全等级等同密码，很多时候更危险：密码泄露还有第二因素挡一下，
  而 refresh token 泄露可以直接换出新的 access token，并且<strong>改密码不一定会立刻作废已签发的 token</strong>
  ——需要在平台侧显式撤销会话。
</p>
<div class="grid2">
  <div class="card">
    <h5>不能做</h5>
    <p>把 token 提交进公开仓库、贴进聊天群或 Issue、写进前端代码、出现在截图与录屏里、放进会自动同步的云盘目录。</p>
  </div>
  <div class="card">
    <h5>能做</h5>
    <p>只放在环境变量或系统密钥管理器里；仓库里放 <code>.env.example</code>；提交前用 secret scanning 与 pre-commit 钩子扫一遍；定期轮换。</p>
  </div>
  <div class="card">
    <h5>泄露后第一件事</h5>
    <p>到平台侧 <strong>revoke 全部会话</strong>，再改密码与第二因素。<em>顺序反了，攻击者手里的 refresh token 可能仍然有效。</em></p>
  </div>
  <div class="card">
    <h5>已经提交过怎么办</h5>
    <p>删掉文件不算解决：历史里还在。必须轮换凭据，必要时重写历史并强推；同时默认它已经泄露。</p>
  </div>
</div>
<h4>本地代理的网络暴露面</h4>
<p>
  「用本地代理统一管理额度与鉴权」是很自然的工程设计，但它的安全性完全取决于<strong>谁能连上它</strong>。
  正确做法是让代理只在私有网络里可达：绑定到
  <span class="t" data-tterm="Tailscale" data-d="基于 WireGuard 的 mesh VPN，把设备组成一个私有网络（tailnet），只有加入网络的设备可以互相访问。">Tailscale</span>
  的接口地址，并用 tailnet ACL 限制哪些设备可以访问；<strong>不要做公网端口转发</strong>，
  不要绑定到 <code>0.0.0.0</code>，也不要把隧道分享成公开链接。
</p>
<table class="tbl small">
  <thead><tr><th>做法</th><th>暴露面</th><th>评价</th></tr></thead>
  <tbody>
    <tr><td>代理只监听 <code>127.0.0.1</code></td><td>仅本机进程</td><td>最安全，但只能单机使用</td></tr>
    <tr><td>绑定 Tailscale 接口 + ACL 限制设备</td><td>tailnet 内的授权设备</td><td><strong>推荐</strong>：跨设备可用，公网不可达</td></tr>
    <tr><td>把家中机器做公网端口转发</td><td>整个互联网的扫描器</td><td>危险：通常几小时内就会被动发现</td></tr>
    <tr><td>公开隧道链接（拿到 URL 即可用）</td><td>所有拿到链接的人</td><td>等于把额度公开赠送</td></tr>
    <tr><td>在代理里硬编码一个自建 API key</td><td>取决于 key 的分发范围</td><td>方便，但引入可被复制的静态密钥</td></tr>
  </tbody>
</table>
<h4>只靠网络身份层鉴权：利弊</h4>
<p>
  「只有我的 tailnet 里的设备才能连上代理」是一种很干净的模型：没有静态密钥可以复制，
  撤销访问只需在设备管理里移除设备。代价是把安全边界整体系在网络这一层：
</p>
<table class="tbl small">
  <thead><tr><th>维度</th><th>只用网络身份层鉴权</th><th>另加自建 API key</th></tr></thead>
  <tbody>
    <tr><td>凭据可复制性</td><td>没有可被复制的静态密钥</td><td>key 一旦泄露可被无限复制</td></tr>
    <tr><td>撤销粒度</td><td>按设备撤销，粒度粗</td><td>可按 key 撤销、限流、设配额</td></tr>
    <tr><td>审计能力</td><td>只能看到「哪台设备」，看不到「哪个应用、谁」</td><td>可按调用方计费与审计</td></tr>
    <tr><td>主要失败模式</td><td><strong>设备一旦被入侵，等于凭据一起泄露</strong></td><td>key 暴露面更小，但容易进仓库</td></tr>
    <tr><td>可用性依赖</td><td>依赖 tailnet 与控制平面在线</td><td>只依赖代理本身</td></tr>
  </tbody>
</table>
<p>
  工程上的折中很清楚：<strong>网络层做第一道门（默认拒绝），应用层再给每个调用方一个独立的小额度 key</strong>，
  两道都不要省。这比争论「哪个更安全」有用得多。
</p>
<p>
  相关文档：
  <a href="https://tailscale.com/docs/features/access-control/acls" target="_blank" rel="noopener">Tailscale ACLs</a>、
  <a href="https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning" target="_blank" rel="noopener">GitHub Secret Scanning</a>。
</p>

<h3>5. 数据隐私设置：上传之前先关掉的开关</h3>
<p>
  订阅产品通常默认把你的对话用于改进模型，而企业版与 API 默认不用于训练。
  个人账号可以通过设置让条款<strong>向企业账号靠拢</strong>：
  以某家客户端为例，它曾在 Settings → Data Controls 里提供「Improve the model for everyone」一类的开关
  （界面随时会改，以你账号当前页面实际显示的为准，这里只当例子看，不要背路径）。
  判据与界面无关，三个答案都要在官方条款页找到并记下日期：<strong>我的对话会不会被用于训练、保留多久、能否导出与删除</strong>。
  其它平台的开关位置与名字都不同，需要你自己在账号设置里找到并确认——
  设置是<strong>账号级</strong>的，多账号要逐个检查。
</p>
<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>训练敏感数据前的检查清单</h4>
  <ol>
    <li><strong>数据里有别人的个人信息吗？</strong>姓名、声音、联系方式、位置、可识别的作品片段都算。</li>
    <li><strong>我有权用它训练吗？</strong>许可证、知情同意、机构审查（伦理审批）三者至少要说清一项。</li>
    <li><strong>相关开关关了吗？</strong>关闭后截图，或记录设置状态与日期，写进实验日志。</li>
    <li><strong>能先去标识化吗？</strong>能删的元数据先删，能降采样的先降，能本地跑的就不要上传。</li>
    <li><strong>上传后我能删掉吗？</strong>先找到删除入口与保留期，再决定是否上传。</li>
    <li><strong>真的需要上传吗？</strong>小模型或本地推理常常够用；「顺手」不是理由。</li>
    <li><strong>项目结束后怎么收尾？</strong>删远端副本、删缓存与检查点，并记录销毁时间。</li>
  </ol>
  <p>
    组织账号与个人账号的条款不同：在学校或公司的账号上做实验之前，先问清楚谁负责合规。
  </p>
</section>

<h3>6. 账号安全：多账号的现实风险</h3>
<p>
  为了并行跑任务，在一台机器上管理 5 到 10 个账号，是这门课里最「方便」也最脆弱的安排。
  风险不在数量本身，而在<strong>它们被同一台机器、同一份凭据缓存、同一个网络出口绑在了一起</strong>：
</p>
<div class="grid2">
  <div class="card">
    <h5>凭据缓存集中</h5>
    <p>同一个用户目录下的 OAuth 缓存、浏览器 profile、密钥链条目：一次恶意脚本、一次误打包上传、一次同步盘泄露，就能同时拿走全部账号。</p>
  </div>
  <div class="card">
    <h5>设备与位置一致</h5>
    <p>同一设备指纹、同一出口下的多个账号互相可关联。一个账号越界被处置，其余账号会一起进入观察名单。</p>
  </div>
  <div class="card">
    <h5>共享与借用</h5>
    <p>把账号借给同学、共用一份订阅，既违反多数条款，也让对方的行为记在你的账号上——责任与风险并不对等。</p>
  </div>
  <div class="card">
    <h5>相对稳妥的做法</h5>
    <p>一个账号一个独立 profile 与独立凭据存储；不要把多账号 token 放进同一个同步目录；自动化用「低价值」账号，主账号只做人工操作。</p>
  </div>
</div>
<h4>被盗之后：处置顺序</h4>
<ol>
  <li><strong>先在平台侧撤销全部会话 / 登出所有设备。</strong>这一步必须排在改密码之前——已签发的 refresh token 通常不会因改密码而失效。</li>
  <li><strong>改密码，并轮换第二因素。</strong>换掉旧的动态口令密钥，改用硬件密钥或 passkey，作废旧恢复码。</li>
  <li><strong>撤销第三方授权与其它凭据。</strong>OAuth 应用授权、API key、部署密钥、CI secret 逐个检查并轮换。</li>
  <li><strong>看账单与用量。</strong>确认是否被用来对外服务或批量抓取；必要时冻结付费、降级套餐。</li>
  <li><strong>顺着邮箱往外查。</strong>攻击者通常从邮箱重置其它账号：检查转发规则、恢复邮箱、已登录设备。</li>
  <li><strong>留证据再申诉。</strong>登录日志、IP、时间线；写成时间线比情绪化描述有用得多。</li>
  <li><strong>复盘暴露面。</strong>清理本地凭据缓存，收紧代理与端口，检查仓库历史是否也泄露过凭据。</li>
</ol>

<h3>7. 学术诚信：申请季最容易出事的地方</h3>
<p>
  规则只有一条，而且很好记：<strong>凡是被用来评价「你的能力」的产出，必须是你自己完成的。</strong>
  换句话说，AI 可以出现在你不被评价的环节（工具链、语言、检索），
  不能出现在被评价的环节（思路、推导、结论、文字表达）。
</p>
<table class="tbl small">
  <thead><tr><th>行为</th><th>判断</th><th>理由</th></tr></thead>
  <tbody>
    <tr><td>用 AI 查文献、定位原始论文、解释陌生术语</td><td>合法的辅助</td><td>属于检索与学习，判断仍在你这</td></tr>
    <tr><td>用 AI 写代码脚手架、调试报错、重构实验脚本</td><td>合法的辅助</td><td>工程工具；被评价的是实验设计与结论</td></tr>
    <tr><td>用 AI 验证自己的推导（找反例、检查边界条件）</td><td>合法的辅助</td><td>相当于请人挑错，推导仍是你写的</td></tr>
    <tr><td>用 AI 润色自己写好的英文段落（不改技术内容）</td><td>合法的辅助</td><td>语言服务；不得改变你的判断与事实</td></tr>
    <tr><td>用 AI 代写个人陈述或申请文书</td><td><strong>学术不端</strong></td><td>文书本身就是被评价对象，而署名人是你</td></tr>
    <tr><td>把 AI 做出来的 STEP / MAT / 竞赛题当作自己的思路提交</td><td><strong>学术不端</strong></td><td>限时考核与「独立完成」声明下，过程即被评价内容</td></tr>
    <tr><td>把 AI 生成的实验数据、图表写成真实测量</td><td><strong>学术不端（伪造数据）</strong></td><td>数据真实性是底线，与是否用 AI 无关</td></tr>
    <tr><td>在明确禁止 AI 的作业或考试中使用</td><td><strong>违规</strong></td><td>违反的是考场与课程规则，不是 AI 本身</td></tr>
    <tr><td>不声明地使用生成内容，并把它作为自己的结论</td><td>灰区，偏违规</td><td>问题不在工具，在「归属」被隐藏</td></tr>
  </tbody>
</table>
<h4>AI 辅助声明：一个可以直接改的模板</h4>
<p>
  很多学校与项目并不禁止 AI，而是要求<strong>声明</strong>。声明要具体到能被核查，
  含糊的一句「我使用了 AI 辅助」没有信息量：
</p>
<pre><code>AI 辅助声明
工具与版本：&lt;工具名 / 模型名&gt;，使用日期 &lt;YYYY-MM-DD 至 YYYY-MM-DD&gt;
用途范围：仅用于 &lt;文献检索 / 代码调试 / 语言润色 / 检查推导中的计算错误&gt;
未使用范围：&lt;研究问题、实验设计、数据分析、结论、正文写作&gt; 由本人独立完成
可核查记录：代码仓库 &lt;URL&gt;，关键提交 &lt;commit hash&gt;，实验日志 &lt;相对路径&gt;
生成内容占比：&lt;例如：代码中约 30% 由工具生成，其余由本人编写并逐行理解&gt;
我确认以上陈述属实，并愿意在面试中解释其中任何一步。</code></pre>
<h4>怎么证明工作是你自己做的</h4>
<p>面试官不会读心，他只会看证据。下面这条证据链在申请材料里很有说服力：</p>
<ul>
  <li><strong>小步、频繁、有意义的提交。</strong>commit message 写「为什么这样改」，而不是「update」；
      时间线要能和你的实验节奏对上。</li>
  <li><strong>失败记录也留在里面。</strong>被推翻的假设、报错、调参历史、删掉的方案。
      真实的科研过程是脏的，这恰恰是真实性的最强证据。</li>
  <li><strong>手写推导与笔记本。</strong>关键公式的手稿照片或扫描件，与代码实现逐项对应。</li>
  <li><strong>AI 生成的部分单独标注。</strong>放在独立目录或独立提交里，不要混进主分支历史冒充自己写的。</li>
  <li><strong>能当场解释。</strong>随机挑三行代码或一个公式，你都能说出为什么这样写、边界条件是什么。</li>
</ul>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>比任何检测工具都现实的约束</h4>
  <p>
    面试只需要三个连续的「为什么」，就能分辨材料是不是你的。所以真正要守住的规则不是「会不会被发现」，而是：
    <strong>不要写你无法当场解释的句子，不要提交你无法当场推导的结论。</strong>
    这条规则同时也在保护你——被追问时不慌，本身就是能力的一部分。
  </p>
</section>

<h3>8. 数据与许可：能不能用，比好不好用更重要</h3>
<p>
  模型的性能上限由数据决定，而数据的<strong>可用范围</strong>由许可证决定。顺序不要反：先看能不能用，再看质量。
</p>
<table class="tbl small">
  <thead><tr><th>许可类型</th><th>核心义务</th><th>对 crossfade 这类未来项目意味着什么（以后立项时可照此查）</th></tr></thead>
  <tbody>
    <tr><td>Public Domain / CC0</td><td>无</td><td>最自由，但仍要记录来源</td></tr>
    <tr><td>CC-BY</td><td>署名</td><td>论文与 README 里要有 attribution 段与许可证清单</td></tr>
    <tr><td>CC-BY-SA</td><td>署名 + 相同方式共享</td><td>你的衍生数据集可能被要求以同样方式开放</td></tr>
    <tr><td>CC-BY-NC</td><td>署名 + 禁止商业使用</td><td>不能用于商业产品，公开发布也要谨慎</td></tr>
    <tr><td>研究用途限定 / 需申请（DUA）</td><td>限定用途与访问者</td><td>通常不能再分发，也不适合放进公开基准比较</td></tr>
    <tr><td>未声明（保留全部权利）</td><td>默认保留所有权利</td><td>不能训练，也不能再分发</td></tr>
  </tbody>
</table>
<p>几个反复出现的坑：</p>
<ul>
  <li><strong>「公开可见」不等于「可以训练」。</strong>论坛帖子、GitHub 代码、流媒体音乐都是公开的，但权利状态各不相同。</li>
  <li><strong>音频与音乐的权利是叠加的。</strong>词曲版权、表演者权、录音制作者权常分属不同主体，另有集体管理组织；
      这就是音频数据集条款普遍更严的原因。</li>
  <li><strong>仓库里逐文件许可可能不同。</strong>一个写着 MIT 的仓库，未必每个文件都是 MIT。</li>
  <li><strong>署名是义务，不是礼貌。</strong>CC-BY 要求你写出原作者、来源与许可证版本。</li>
</ul>
<h4>数据集污染：最容易失效的一种</h4>
<p>
  如果训练语料里包含了测试集样本（或它的近似副本），测试分数就会虚高，
  而且<strong>换随机种子永远修不好</strong>——问题不在优化，在数据。
  检查办法：对训练语料与测试集做精确、子串与近似近邻（n-gram 或嵌入）匹配；
  确认基准题目本身没有被整篇抓进语料；在报告里写清你做过的去重步骤。
</p>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>把公共 benchmark 分数当作自己的成果</h4>
  <p>
    排行榜分数受数据污染、prompt 格式、few-shot 示例数量、评测脚本版本与解码参数共同影响。
    「我复现了某个分数」与「我在这个基准上改进了多少」是两种完全不同的主张：
    前者是复现，后者需要控制变量、固定评测协议，并做统计检验。
    在申请材料里把前者写成后者，是最常见、也最容易被面试官拆穿的一种夸大。
  </p>
</section>

<h3>9. 科研诚实：幻觉引用与负结果</h3>
<p>
  语言模型会生成<strong>格式完美但不存在的参考文献</strong>：标题合理、作者真实、期刊像真的，
  连 DOI 与页码都能编出来。这不是偶发故障，而是「流畅生成看起来像引用的文本」这一机制的必然结果。
  所以引用必须<strong>逐条核查</strong>，流程如下：
</p>
<ol>
  <li><strong>每条引用都要能打开并确认。</strong>用 DOI 解析到出版社或 arXiv 页面，核对标题、作者、年份、发表处四项。</li>
  <li><strong>优先用 DOI，而不是搜标题。</strong>幻觉常给出真实论文的近似变体标题；按标题搜索会搜到一篇「差不多的」真论文，于是你引错了对象。</li>
  <li><strong>确认你引用的是原文，而不是二手复述。</strong>大量引用错误来自「引用的引用」。</li>
  <li><strong>不要把 LLM 生成的参考文献直接入库。</strong>BibTeX 里的每个 DOI 都要解析验证，一个都不能跳过。</li>
  <li><strong>用管理器的导入功能</strong>（按 DOI 或 arXiv ID 抓取元数据），而不是手写或粘贴生成条目。</li>
  <li><strong>收尾检查两遍：</strong>正文里每个引用都有对应条目，每个条目都在正文被引用；删掉「放着好看」的装饰性引用。</li>
</ol>
<section class="blk blk-tip">
  <h4><span class="ic">✓</span>负结果也要记录</h4>
  <p>
    被推翻的假设、不显著的检验、复现失败的实验，都要写进日志与报告。
    这不是自我否定，而是<strong>对你结论强度最诚实的估计</strong>；
    只报告显著结果会直接制造错误结论，也是科研不端的典型形式。
    实践上做到两点就够：<strong>在跑检验之前写下分析计划</strong>（检验什么量、用什么阈值、怎么分组），
    以及<strong>把每次实验都记下来</strong>，包括没成功的那几次。
  </p>
  <p>
    措辞也要克制：「结果不支持 X」不等于「证明 X 为假」，尤其在样本量只有几百时。
    报告应给出效应量与置信区间，而不只是 p 值。
  </p>
</section>

<h3>10. 风险登记表</h3>
<p>
  把上面全部内容压缩成一张可以放在项目文档首页的表。最后一列是给你自己填的：
  核对来源，以及你核对它的日期。
</p>
<table class="tbl small">
  <thead><tr><th>风险</th><th>触发条件</th><th>后果</th><th>缓解措施</th><th>需要核实的官方来源</th></tr></thead>
  <tbody>
    <tr>
      <td>订阅额度越界</td>
      <td>把个人凭证接给外部使用：对外 API、网站后端、替第三方调用</td>
      <td>账号封禁、已付费用与额度损失、自动化链路中断</td>
      <td>只用于本机与内部自动化；对外服务改用按量计费的商用 API 并独立计费</td>
      <td>各平台服务条款与使用政策（automated access、resale 相关条目）</td>
    </tr>
    <tr>
      <td>模型蒸馏</td>
      <td>用订阅模型的输出批量生成数据，去训练自己的模型</td>
      <td>封禁，并可能引发法律纠纷（竞争模型条款）</td>
      <td>不使用订阅输出作为训练数据；改用许可明确的开放数据集</td>
      <td>条款中关于「用输出开发竞争模型」的条目</td>
    </tr>
    <tr>
      <td>云机房 IP 被风控</td>
      <td>从 AWS / Hetzner / DigitalOcean 等网段发起多账号或高频请求</td>
      <td>403 / 429 / 验证码、强制重认证、临时封禁</td>
      <td>出口固定到可信住宅 IP 网关；账号与出口一一对应；把并发摊平</td>
      <td>平台关于自动化访问与异常流量的政策</td>
    </tr>
    <tr>
      <td>多国并发认证</td>
      <td>同一账号短时间内从多个国家登录</td>
      <td>风险标记、会话被撤销、额度冻结、要求人工申诉</td>
      <td>单账号单地区；变更地区前先正常登录一次并观察</td>
      <td>账号安全帮助页中关于异常登录与设备管理的说明</td>
    </tr>
    <tr>
      <td>OAuth token 泄露</td>
      <td>token 进入公开仓库、聊天记录、截图或前端代码</td>
      <td>账号被完全接管、额度被消耗、关联账号一起受牵连</td>
      <td>只存环境变量或密钥管理器；提交前扫描；泄露后立刻 revoke 全部会话</td>
      <td>平台的 token 撤销流程与凭据管理最佳实践</td>
    </tr>
    <tr>
      <td>代理暴露到公网</td>
      <td>端口转发、绑定 <code>0.0.0.0</code>、把隧道分享成公开链接</td>
      <td>任何人可消耗你的额度，并把滥用流量记在你的账号上</td>
      <td>只绑定 tailnet 接口并用 ACL 限制设备；关闭端口映射与 UPnP</td>
      <td>Tailscale ACL 与设备管理文档</td>
    </tr>
    <tr>
      <td>训练数据涉隐私</td>
      <td>把含个人信息的音频或文本上传到云端服务</td>
      <td>违约、合规与伦理责任，可能被迫撤回成果</td>
      <td>关闭训练开关并留证；去标识化；取得同意；能本地就本地</td>
      <td>平台的隐私与数据保留政策、所在机构的伦理审查要求</td>
    </tr>
    <tr>
      <td>账号被盗</td>
      <td>钓鱼、恶意扩展、密码复用、本地凭据缓存被读取</td>
      <td>项目与申请材料被破坏、身份被冒用、连带损失</td>
      <td>硬件第二因素、独立 profile、最小权限；发现后先撤销全部会话再改密码</td>
      <td>平台账号恢复与安全设置文档</td>
    </tr>
    <tr>
      <td>数据集许可越界</td>
      <td>使用 research-only 或 NC 数据集，产出可公开分发的成果</td>
      <td>被迫撤稿或下架，法律风险</td>
      <td>逐数据集核对许可证；README 写 attribution；商业用途换数据</td>
      <td>数据集页面的许可证原文（Creative Commons 官方文本）</td>
    </tr>
    <tr>
      <td>数据集污染</td>
      <td>训练语料含测试集样本或基准原题</td>
      <td>分数虚高、结论无效、被质疑</td>
      <td>训练前做精确 / 子串 / 近邻去重；在报告里披露污染检查</td>
      <td>基准官方关于数据划分与去重的说明</td>
    </tr>
    <tr>
      <td>幻觉引用</td>
      <td>LLM 生成的参考文献未经核实就入库</td>
      <td>学术不端指控、可信度崩塌</td>
      <td>每条引用打开验证（DOI / 出版社页）；不用生成条目直接入库</td>
      <td>DOI 解析页、出版社或 arXiv 摘要页</td>
    </tr>
    <tr>
      <td>学术不端（文书 / 限时题 / 数据）</td>
      <td>AI 代写文书、代做限时题、把生成数据写成实测</td>
      <td>申请被取消、录取被撤销</td>
      <td>被评价的环节自己完成；AI 只用于检索、语言与脚手架；保留日志与提交记录</td>
      <td>学校与考试机构的学术诚信政策、申请系统关于 AI 的说明</td>
    </tr>
    <tr>
      <td>选择性报告</td>
      <td>只汇报显著的检验，隐去负结果与失败实验</td>
      <td>结论不可复现，构成科研不端</td>
      <td>事先写下分析计划；记录全部实验与失败</td>
      <td>期刊与会议的科研诚信政策</td>
    </tr>
  </tbody>
</table>

<h3>11. 自测：这条线越界了吗</h3>
<div class="quiz">
  <div class="qlabel">自测 · 1 · 订阅额度</div>
  <p class="q">下列四种用法中，哪一种最接近「越界」？</p>
  <ul class="opts">
    <li>在本机 IDE 里用订阅额度重构你自己的实验代码</li>
    <li>在私有仓库的 CI 里自动审阅你自己的 PR</li>
    <li data-ok>把订阅凭证接进一个公开网页，任何访客都能免费提问</li>
    <li>用订阅额度把自己写好的中文摘要润色成英文</li>
  </ul>
  <p class="why">
    前三项都是「你用工具完成自己的工作」：本机编码与内部自动化在记录中属于常见做法，
    前提是账号与产物都属于你、没有外部用户。
    第三项把个人凭证变成了<strong>面向不特定公众的服务后端</strong>：判定看的是使用形态而不是有没有收费，
    而且一旦有滥用流量混进来，风控会记在你的账号上——它同时踩中了三问判断法的第一条与第二条。
  </p>
</div>
<div class="quiz">
  <div class="qlabel">自测 · 2 · token 与代理</div>
  <p class="q">关于 token 与本地代理的判断，哪一条是正确的？</p>
  <ul class="opts">
    <li>只读权限的 token 无所谓，可以放进公开仓库</li>
    <li>只要代理设置了足够长的密码，就可以安全地做公网端口转发</li>
    <li data-ok>OAuth token 等同账号密码：泄露后第一件事是在平台侧撤销全部会话；代理只绑定 tailnet，不做公网映射</li>
    <li>把 token 放进前端代码，再做一层混淆，外部就无法还原</li>
  </ul>
  <p class="why">
    第一项错在「只读」也能读取你的数据与元数据，而且 token 的权限常比标注的更多；
    第二项错在暴露面不是密码强度问题——公网端口会被扫描器持续探测，认证实现上的任何问题都会变成额度被白嫖；
    第四项错在混淆不是加密，前端的一切最终都会到达用户机器。
    第三项里「先撤销会话、再改密码」的顺序之所以重要，是因为长期 refresh token 可能不随密码变更而失效。
  </p>
</div>
<div class="quiz">
  <div class="qlabel">自测 · 3 · 学术诚信</div>
  <p class="q">个人陈述里涉及 AI 辅助的一段，下面哪一种写法既合规、又能在面试里被追问而不穿帮？</p>
  <ul class="opts">
    <li>完全不提 AI，把所有产出都写成自己独立完成</li>
    <li data-ok>写清：代码图表由 AI 辅助起草，所有数字我逐个运行核对过，脚本见 scripts/，实验设计与结论归我</li>
    <li>实验设计、执行与结论全由 AI 完成，我负责把关方向</li>
    <li>只写「使用了 AI 工具」，不写用在哪、怎么核查</li>
  </ul>
  <p class="why">
    判断标准只有一条：<strong>这个产出是不是被用来评价你的能力，以及你能不能当场复述与推导</strong>。
    第一项是主动隐瞒，一旦被问到细节就会穿帮；第三项里被评价的设计与结论不是你做的；
    第四项的披露没有范围与证据，等于没说。只有第二项同时满足「范围可核查 + 数字可复现 + 责任归属清晰」。
  </p>
</div>

<div class="acc" data-t="深入：项目启动前的十分钟合规检查" data-badge="可选">
  <div class="acc-body">
    <p>在每个新实验开始前，按顺序回答下面七个问题，并把答案写进项目的 README 或实验日志：</p>
    <ol>
      <li>这个实验会调用哪些付费或订阅服务？分别属于哪个账号，条款允许这种用法吗？</li>
      <li>会产生对外可见的流量吗？如果没有，写一句「仅本机与内部自动化」并注明日期。</li>
      <li>数据从哪来？许可证是什么？商业使用是否被允许？需不需要署名？</li>
      <li>数据里有个人信息吗？上传前关掉训练开关了吗？留下的证据在哪？</li>
      <li>凭据存在哪里？有没有进入版本控制的可能？仓库开了 secret scanning 吗？</li>
      <li>代理与端口暴露面是什么？只对 tailnet 开放吗？有没有做过端口转发？</li>
      <li>这个实验的哪些部分会被写进申请材料？其中哪些结论我能在面试中当场推导？</li>
    </ol>
    <p>
      这七个问题通常只要十分钟，但它们涵盖了本附录里几乎所有不可逆的风险。
    </p>
  </div>
</div>
`
});
