/* content/13-resets.js — 模块 13：实验流水线与断点调度 */
COURSE.register({
  id: "m13",
  part: 3,
  num: "13",
  title: "实验流水线与断点调度：会话超时、检查点续训与早停决策",
  en: "Experiment Pipeline: Checkpointing, Runtime Resumption & Early Stopping",
  minutes: 25,
  tags: ["流水线", "检查点", "早停", "断点续训"],
  body: String.raw`
<p class="lead">
  在 Kaggle Notebooks（提供双卡 T4 ×2 / 单卡 T4，每周 30 小时免费 GPU）开展深度学习实验时，<strong>会话随时可能因网络抖动或超时机制而被迫重置</strong>。
  真正的工程素养不在于祈祷环境永不断线，而在于设计<strong>坚不可摧的检查点持久化（Checkpointing）与优雅恢复流水线</strong>，
  同时建立<strong>严格的早停（Early Stopping）决策准则</strong>，不在注定发散的实验上白白耗费宝贵的探索时间。
</p>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>核心痛点：辛辛苦苦跑了 2 小时，浏览器一刷新全没了？</h4>
  <p>
    几乎所有在云端训练模型的初学者都经历过这种绝望：训练跑了 8000 个 step，眼看就要收敛，临时容器突然断开连接，保存在本地 <code>/tmp</code> 或当前目录的权重全部化为乌有。
    本模块教你如何将状态存储与训练循环彻底解耦，做到随时断线、随时一键原地满血复活。
  </p>
</section>

<h3>1. 完整的训练检查点（Checkpoint）到底包含什么？</h3>
<p>
  许多人误以为断点续训只要保存模型的权重矩阵 <code>model.state_dict()</code> 就够了。
  <strong>大错特错！</strong>只恢复权重会导致优化器丢失所有的历史动量与学习率状态，直接造成接续训练时的损失剧烈震荡跳变。
  一个生产级严密的 Checkpoint 必须打包以下四项：
</p>

<table class="tbl">
  <thead><tr><th>组件</th><th>包含内容</th><th>若遗漏的致命后果</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>模型参数（Model Weights）</strong></td>
      <td>各层可学习权重与偏置（\(\mathbf{W}, \mathbf{b}\)）</td>
      <td>模型回到初始随机状态，前功尽弃</td>
    </tr>
    <tr>
      <td><strong>优化器状态（Optimizer State）</strong></td>
      <td>AdamW 的一阶动量 \(\mathbf{m}_t\) 与二阶动量 \(\mathbf{v}_t\)</td>
      <td>动量归零，接续训练时步长突变，导致 Loss 曲线瞬间剧烈尖刺（Spike）甚至发散</td>
    </tr>
    <tr>
      <td><strong>学习率调度器（LR Scheduler）</strong></td>
      <td>当前已经执行的 <code>step</code> 与所处的 Warmup/Decay 衰减阶段</td>
      <td>学习率可能被重置为初始峰值，使接近收敛的模型被超大学习率瞬间“震毁”</td>
    </tr>
    <tr>
      <td><strong>混合精度缩放器（GradScaler）</strong></td>
      <td>FP16 训练时的动态损失放大系数 <code>scaler.state_dict()</code></td>
      <td>出现数值溢出（Overflow）或下溢，导致梯度变为 NaN</td>
    </tr>
  </tbody>
</table>

<h3>2. 工业标准断点续训代码范式</h3>
<p>
  在 Kaggle Notebooks 环境中，标准持久化输出路径为 <code>/kaggle/working/</code>。自动轮转 Checkpoint 代码应当如下组织：
</p>

<p><strong>断点原子化保存微算子演示：</strong></p>
<pre><code>ckpt = {'model': model.state_dict(), 'optimizer': optimizer.state_dict(), 'step': step}
torch.save(ckpt, f'/kaggle/working/ckpt_step_{step}.pt')</code></pre>
<p>
  <strong>逐行解析</strong>：保存断点必须将模型权重与优化器内部一阶/二阶动量状态一同打包序列化至 <code>/kaggle/working/</code>；如果遗漏优化器状态，恢复训练时由于历史动量归零，极易导致单步梯度方向突变、损失剧烈跳跃甚至梯度爆炸。
</p>

<h3>3. 早停法（Early Stopping）：避开沉没成本谬误</h3>
<p>
  在探索自训模型时，最浪费精力的事情不是断线，而是<strong>明知道模型已经发散或严重过拟合，却依然让它继续空转跑完全程</strong>。
  科学的训练流水线必须设定清晰的早停准则（Early Stopping Rule）：
</p>
<table class="tbl small">
  <thead><tr><th>诊断信号</th><th>底层物理原因</th><th>果断决策行动</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>初始 Loss 为 NaN 或 Inf</strong></td>
      <td>学习率过高引发梯度爆炸，或数值除零/Log 越界</td>
      <td><strong>立即终止</strong>：检查是否遗漏 Softmax 数值稳定性减 Max 处理，或将学习率缩小 3~5 倍</td>
    </tr>
    <tr>
      <td><strong>Warmup 结束后验证集 Loss 连续 3 次不降反升</strong></td>
      <td>模型容量不足以记忆语料，或严重过拟合于噪声数据</td>
      <td><strong>果断停机</strong>：启用 Weight Decay 权重衰减，或缩减模型层数、增加数据清洗</td>
    </tr>
    <tr>
      <td><strong>Loss 曲线长时间水平停滞（Plateau）</strong></td>
      <td>学习率衰减过早、梯度消失或进入极浅鞍点</td>
      <td><strong>检查梯度范数</strong>：若 \(\|\mathbf{g}\| \approx 0\)，调整学习率调度器或检查残差连接</td>
    </tr>
  </tbody>
</table>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">在自回归模型断点续训时，为什么不能只加载模型权重，而必须同时恢复 AdamW 优化器的状态？</p>
  <ul class="opts">
    <li>因为不恢复优化器代码会报错崩溃</li>
    <li data-ok>AdamW 依赖历史的一阶动量与二阶方差来平滑梯度；若重置为零，更新步长会发生突变，容易引发损失跳变甚至梯度爆炸</li>
    <li>为了让模型能自动识别词表大小</li>
    <li>因为优化器状态里存储了上下文序列长度</li>
  </ul>
  <p class="why">
    AdamW 更新量取决于 \(\frac{\mathbf{m}_t}{\sqrt{\mathbf{v}_t} + \epsilon}\)。如果不恢复 \(\mathbf{m}_t\) 与 \(\mathbf{v}_t\)，相当于从冷启动重新估计方差，会导致短时间内更新步长剧烈抖动。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">在 Kaggle Notebooks 云端环境上运行长时间模型训练，防范会话意外断开最有效、最关键的措施是？</p>
  <ul class="opts">
    <li>始终开着网页不关电脑</li>
    <li data-ok>在训练循环中定期将模型与优化器打包保存至外部挂载的持久存储（如 Kaggle 的 <code>/kaggle/working</code> 或 Hugging Face Hub 私有仓库）</li>
    <li>多开几个不同的浏览器窗口</li>
    <li>只在晚上无人使用时运行</li>
  </ul>
  <p class="why">
    临时云端实例的本地磁盘是易失性的，唯有将权重外存到持久化网络存储中，才能保证断开重连后无损恢复。
  </p>
</div>
`
});
