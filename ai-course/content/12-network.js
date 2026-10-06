/* content/12-network.js — 模块 12：反封禁网络架构 */
COURSE.register({
  id: "m12",
  part: 3,
  num: "12",
  title: "网络架构：住宅 IP、Tailscale 与本地代理",
  en: "Networking, Residential IP & Local Proxy",
  minutes: 35,
  tags: ["系统", "网络", "风险"],
  body: String.raw`
<p class="lead">
  这一模块讲的是「让你的请求看起来像一个人」的工程问题。
  内容来自访谈记录中的自建架构：一台家用机器、一条住宅 IP、一个 Tailscale 覆盖网、若干个 OAuth 会话。
  <strong>先读最后的合规与安全提示，再决定要不要搭。</strong>
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>问题</h4>
  <p>
    你有多个账号、若干台设备（笔记本、服务器、CI 机器）。如果每台设备各自直连平台，
    就会出现「同一账号从多个国家/IP 并发认证」的痕迹，触发风控；而如果全部来自一台云主机，
    又会掉进数据中心 IP 的特征里。怎么设计既安全又可用？
  </p>
</section>

<h3>1. 为什么 IP 会成为问题</h3>
<table class="tbl">
  <thead><tr><th>风险信号</th><th>机制</th><th>典型后果</th></tr></thead>
  <tbody>
    <tr><td><strong>数据中心 IP 段</strong></td><td>AWS / Hetzner / DigitalOcean 等云厂商的地址段被广泛用于代理转售与批量抓取（含模型蒸馏）</td><td>认证请求直接被标记，账号受限或封禁</td></tr>
    <tr><td><strong>多 IP 认证碰撞</strong></td><td>同一账号在短时间内从多个地理位置发起认证与并发请求</td><td>自动化风险标记，触发验证或限权</td></tr>
    <tr><td><strong>设备指纹不一致</strong></td><td>客户端版本、时区、语言与 IP 地理不匹配</td><td>累积为可疑度评分</td></tr>
    <tr><td><strong>流量形态异常</strong></td><td>极高的并发、规律的固定间隔请求</td><td>被识别为自动化滥用</td></tr>
  </tbody>
</table>
<p>
  记录中的结论很直接：<strong>所有出站请求应汇聚到一条来自家庭网络的住宅 IP</strong>。
  住宅 IP 之所以「干净」，是因为它属于普通宽带用户，不与批量转售、蒸馏抓取的行为模式强相关。
</p>

<h3>2. 记录中的拓扑</h3>
<pre><code>                    +-----------------------------------------------+
                    |          Residential Gateway (Home)          |
                    |  - Single Residential Public IP               |
                    |  - Dedicated Ubuntu Node / Framework Desktop  |
                    |  - CLI Proxy / Vibe Proxy Daemon              |
                    |  - Manages OAuth sessions for 5-10 accounts   |
                    +-----------------------+-----------------------+
                                            |
                               Tailscale Mesh Overlay
                           (micro.ts.net / WireGuard)
                                            |
          +---------------------------------+---------------------------------+
          |                                 |                                 |
  +------------------+             +--------------------+            +-------------------+
  | MacBook Pro      |             | Dedicated Server   |            | Remote Dev Server |
  | (Client / UI)    |             | "Alvin" (Headless) |            | "BB1" (Linux)     |
  | - T3 Code Client |             | - Docker / Worktrees|           | - CI / Build jobs |
  | - No direct LLM  |             | - Routes via proxy |            | - Routes via proxy|
  +------------------+             +--------------------+            +-------------------+</code></pre>
<dl class="kv">
  <dt>住宅网关</dt><dd>家里的一台机器，唯一出口；运行代理守护进程，管理 5–10 个账号的 OAuth 会话</dd>
  <dt>Tailscale 覆盖网</dt><dd>基于 WireGuard 的 mesh，把笔记本、家庭节点、远程服务器组成一个私有网络</dd>
  <dt>客户端</dt><dd>笔记本只做 UI，<strong>不直接持有模型凭据</strong>；所有推理请求经覆盖网回到住宅网关</dd>
</dl>

<h3>3. 代理守护进程做四件事</h3>
<ol>
  <li><strong>OAuth 会话管理</strong>：通过 OAuth 登录各平台的 CLI 工具，持久刷新 token，避免频繁重新认证。
      对外暴露一个<strong>本地、兼容 Bedrock / OpenAI 协议</strong>的 HTTP 端点。</li>
  <li><strong>改写上游端点</strong>：Claude Code 与 Codex 这类 CLI 原生支持为「企业 AWS Bedrock 用户」配置自定义 API base URL。
      于是可以把上游地址<strong>指向本地代理</strong>，而不需要修改客户端代码——这是整个方案的关键接口。</li>
  <li><strong>智能到期路由</strong>：默认代理是轮询；记录中的改进是<strong>按重置窗口排序</strong>——
      优先使用「即将到期」的账号（例如 12 小时后重置的先用满，再去动还有 4 天的）。</li>
  <li><strong>账号亲和（session affinity）</strong>：把每个对话线程固定到同一个账号（原因见第 5 节）。</li>
</ol>

<h3>4. 绑定方式：只挂在 tailnet 上</h3>
<ul>
  <li>代理监听在家庭机器上（记录中的示例是 <code>bb1.micro.ts.net:318</code>），<strong>只绑定到 Tailscale 网络</strong>。</li>
  <li><strong>不做任何公网端口转发</strong>，因此没有暴露面。</li>
  <li><strong>不需要自建 API key</strong>：访问控制由 Tailscale 的身份层完成（只有你的设备在网内）。</li>
  <li>代价：所有流量都要绕回家里；家庭宽带上行带宽与断网风险就是你的可用性上限。</li>
</ul>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>安全底线</h4>
  <ul>
    <li>OAuth token 等同于账号密码。<strong>不要</strong>把它写进公开仓库、贴进聊天、或放进客户端配置里共享。</li>
    <li>Tailscale 的 ACL 要限制哪些设备能访问代理端口；不要用 <code>--shields-up=false</code> 之类的宽松配置。</li>
    <li>「不需要 API key」是<strong>因为网络身份层已经鉴权</strong>，不是因为没有鉴权。把该端口暴露到公网等于把账号送人。</li>
    <li>多账号在同一台机器上缓存凭据，一旦机器被入侵，全部账号同时失守。做好磁盘加密与最小权限。</li>
  </ul>
</section>

<h3>5. 账号亲和：一个 80 万 token 的教训</h3>
<section class="blk blk-m">
  <h4><span class="ic">∑</span>为什么切换账号会「很贵」</h4>
  <p>
    Anthropic 的提示缓存（prompt cache）存活时间约为 <strong>5 分钟</strong>，并且<strong>绑定到具体账号</strong>。
    如果在同一个线程中途切换账号（或同一批顺序工具调用之间切换），缓存随之失效：
  </p>
  \[ \text{rewrite cost} \approx c_{\text{in}} \times T_{\text{prefix}}, \qquad T_{\text{prefix}} \le 8\times10^{5}\ \text{tokens} \]
  <p>
    记录中的表述是：切换账号会强制重写高达 80 万 token 的前缀。
    因此代理<strong>必须把每个会话固定到同一账号</strong>——
    这与第 4 节「按到期时间优先」的策略是<em>相互冲突</em>的两个目标，需要按「先亲和、再在账号内部调度」的顺序处理。
  </p>
</section>
<p>
  同理，任何<strong>负载均衡</strong>（哪怕是同一账号的多实例）都会击穿前缀缓存。
  正确顺序是：<em>先保证线程级亲和，再在可用的账号集合里做到期时间优先；永远不要在线程中途切换。</em>
</p>

<h3>6. 长连接：把 WebSocket 用起来</h3>
<p>
  记录中的观察：走原始 HTTP 代理时，每个请求都要重新握手，累积成可观的延迟；
  把代理改为<strong>维持长连接（持久 WebSocket）</strong>后，往返开销显著下降。
</p>
<p>
  通用原则：<strong>高频、小载荷、固定对端的调用，应该复用连接</strong>。
  这与数据库连接池、HTTP/2 多路复用是同一个工程直觉，只是应用在了模型 API 上。
</p>

<h3>7. 合规判断（必读）</h3>
<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>这套架构的合法用途与红线</h4>
  <p><strong>技术本身是中性的</strong>：用 Tailscale 把自己的设备连起来、给自家 CLI 工具配一个本地代理，是正常的自托管实践。</p>
  <ul>
    <li><strong>可以</strong>：管理自己的多个账号、把家庭网络作为唯一出口、在多台自有设备间共享一个本地端点、为自己做实验。</li>
    <li><strong>不可以</strong>：把额度转售或提供给第三方；把个人订阅当作面向公众的产品后端；用自动化批量抓取输出用于模型蒸馏。</li>
    <li><strong>灰色地带</strong>：用多个账号的「个人额度」承载远超个人使用强度的自动化负载。即使技术上可行，也可能被判定为滥用。</li>
  </ul>
  <p><em>平台条款与风控策略持续变化。本模块只解释机制与权衡；是否搭建、如何配置，需要你自行核对官方条款并承担后果。详见附录 D。</em></p>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>以后可以安全迁移到 crossfade 这类项目的部分</h4>
  <ul>
    <li><strong>单一出口 + 私有覆盖网</strong>：把「训练机 / 笔记本 / CI」统一到一个私有网络，所有外部调用走同一条路径——这在任何云上都是良构做法。</li>
    <li><strong>协议兼容的本地端点</strong>：把「模型调用」抽象成本地 HTTP 服务，换供应商时只改一个地址。这对以后做这类实验的复现性有直接好处。</li>
    <li><strong>缓存亲和性</strong>：任何有状态缓存（前缀缓存、编译缓存、特征缓存）都应避免被随机调度打散。</li>
    <li><strong>成本可见性</strong>：给每个任务打上标签，统计 token 消耗。没有计量就没有优化。</li>
  </ul>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">为什么记录中的架构要求「所有出站请求汇聚到一条住宅 IP」？</p>
  <ul class="opts">
    <li>因为住宅宽带更快</li>
    <li data-ok>数据中心 IP 段与代理转售、批量抓取等滥用行为相关，容易被风控标记；多地点并发认证同样会触发风险</li>
    <li>因为平台按 IP 计费</li>
    <li>因为 Tailscale 只能用于住宅网络</li>
  </ul>
  <p class="why">
    风控看的是行为特征与来源的一致性。住宅 IP、单一出口、设备一致，才构成「一个真实用户」的画像。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">代理把对话线程在中途切换到另一个账号，最直接的代价是什么？</p>
  <ul class="opts">
    <li>输出质量下降</li>
    <li data-ok>提示缓存失效（缓存绑定账号、存活约 5 分钟），需要重写可能高达数十万 token 的前缀</li>
    <li>会被立即封号</li>
    <li>会话历史丢失</li>
  </ul>
  <p class="why">
    前缀缓存按账号与逐 token 前缀匹配。切换账号等于让缓存全部作废，
    于是你为同一段前缀付两次输入费用，并且首 token 延迟上升。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">「把代理只绑定到 Tailscale tailnet、不做公网端口转发、不设 API key」这一组合的安全性来自哪里？</p>
  <ul class="opts">
    <li>来自端口号不容易被猜到</li>
    <li data-ok>来自网络身份层：只有加入 tailnet 且通过 ACL 的设备能访问，攻击面不暴露在公网</li>
    <li>来自请求频率限制</li>
    <li>来自操作系统的防火墙默认规则</li>
  </ul>
  <p class="why">
    这是「零信任覆盖网」的典型用法：鉴权从应用层移到网络层。
    但前提是 ACL 正确、设备本身可信；一旦端口暴露到公网，这个前提立刻消失。
  </p>
</div>

<div class="acc" data-t="深入：如果你不想搭这套东西" data-badge="替代">
  <div class="acc-body">
    <p>同一批工程目标（单一出口、凭据集中、缓存亲和、成本可见），有成本低得多的实现：</p>
    <ol>
      <li><strong>单机 + 环境变量</strong>：只在一台机器上配置 CLI 工具，其他设备通过 SSH 使用它。零新组件。</li>
      <li><strong>Tailscale 直连 + 反向代理</strong>：用 <code>tailscale serve</code> 暴露本地端口，不用自己写守护进程。</li>
      <li><strong>凭据集中管理</strong>：用系统钥匙串 / 1Password CLI 注入环境变量，避免明文 token 落盘。</li>
      <li><strong>不池化账号</strong>：如果你只有一个账号（例如只用 Codex Plus + Colab），第 12 模块的大部分复杂度都不需要——
          你只需要「固定出口 + 缓存亲和」这两条。</li>
    </ol>
    <p><strong>决策建议</strong>：先问「我到底需要几个账号」。多数个人研究者的答案是 1–2 个，
    此时自建代理的收益远小于它带来的安全与合规负担。</p>
  </div>
</div>
`
});
