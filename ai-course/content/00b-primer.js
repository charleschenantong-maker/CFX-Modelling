/* content/00b-primer.js — 模块 P：零基础预备课 */
COURSE.register({
  id: "mP",
  part: 0,
  num: "P",
  title: "预备课：从「猜下一个词」到「训练」——把基础概念串起来",
  en: "Primer — From Guessing to Training",
  minutes: 60,
  tags: ["零基础", "必读", "直觉优先", "Karpathy体系"],
  body: String.raw`
<p class="lead">
  这一讲的假设只有一个：你听说过 <strong>Token</strong>、<strong>神经网络</strong>、<strong>概率预测</strong>这几个词，
  但如果有人问你「训练到底在物理和代码层面转动了哪些齿轮」，你希望能真正搞得一清二楚。
  我们不调任何现成的深度学习黑盒库，直接借鉴 Andrej Karpathy 的经典教学 <code>micrograd</code>，
  用最纯粹的 Python 亲手手写一个标量自动求导引擎。
  用直观通俗的几何直觉配上严谨的微积分链式法则，建立从标量微分到万亿参数模型训练循环的坚固基座。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>学习指引：如何建立直觉与数学的连接</h4>
  <p>
    <strong>不跳读、手推每一个步骤、亲手运行代码。</strong>
    不要把机器学习看作某种神秘的魔法，它本质上是<em>多元微积分、线性代数与数值分析在离散图结构上的工程落地</em>。
  </p>
  <p>
    学完这一讲，你必须能够胸有成竹地回答五个底层问题：
    <strong>①</strong> 为什么计算图必须是 DAG，且反向传播必须严格按拓扑逆序执行？<br/>
    <strong>②</strong> 为什么在分支节点处梯度必须累加（<code>+=</code>）而不是覆盖（<code>=</code>）？<br/>
    <strong>③</strong> 为什么语言模型的输出必须是概率分布而非单一确定性 Token？<br/>
    <strong>④</strong> 为什么损失函数选用负对数似然（NLL）？<br/>
    <strong>⑤</strong> 梯度下降在几何上究竟意味着什么？
  </p>
</section>

<h3>1. 全景大图：从一段文本到一次权重微调</h3>
<div class="flow">
  <div class="nd">自然语言序列</div><div class="ar">→</div>
  <div class="nd">Token 整数序列</div><div class="ar">→</div>
  <div class="nd">向量空间嵌入 (Embedding)</div><div class="ar">→</div>
  <div class="nd hi">网络计算图 (前向传播)</div><div class="ar">→</div>
  <div class="nd">未归一化分值 Logits</div><div class="ar">→</div>
  <div class="nd">Softmax 概率化</div><div class="ar">→</div>
  <div class="nd">交叉熵损失 (NLL)</div><div class="ar">→</div>
  <div class="nd hi">拓扑逆序反向传播 (链式法则)</div><div class="ar">→</div>
  <div class="nd">参数更新 (梯度下降)</div>
</div>
<p>
  整门课程要解构的就是这条因果链条。后续章节出现的各种复杂名词——BPE 分词器、自注意力、残差流、RMSNorm、RoPE 旋转位置编码、AdamW 优化器，
  全部都只是这个宏大计算图流水线中某一节点的具体实现与数值优化。
</p>

<h3>2. 核心数学骨架：标量计算图 (DAG) 与多元微积分链式法则</h3>
<p>
  任何神经网络在计算机底层执行时，不论使用了多少维度的张量（Tensor），都可以展开为一张由基础标量运算（加、减、乘、除、指数、最大值）组成的
  <strong>有向无环图（Directed Acyclic Graph, DAG）</strong>。
  在这张图中：
</p>
<ul>
  <li><strong>叶子节点 (Leaf nodes)</strong>：模型可学习的参数权重 \(w, b\) 或外界输入的特征 \(x\)；</li>
  <li><strong>内部节点 (Internal nodes)</strong>：对前驱节点执行基本算子后得到的中间计算结果；</li>
  <li><strong>根节点 (Root node)</strong>：标量标尺——标量损失值 \(\mathcal{L}\)（Loss）。</li>
</ul>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>STEP 级严密推导：多元微积分链式法则 (Multivariable Chain Rule)</h4>
  <p>
    在单变量微积分中，复合函数 \(f(g(x))\) 的求导法则由莱布尼茨符号简洁表达为 \(\frac{df}{dx} = \frac{df}{dg} \frac{dg}{dx}\)。
    但在计算图中，一个变量 \(x\) 的取值往往会同时流向多个后续计算分支。
  </p>
  <p>
    <strong>定理（分支图上的全微分分解）</strong>：设标量损失 \(\mathcal{L}\) 为中间变量集合 \(z_1, z_2, \dots, z_k\) 的光滑函数，
    而每个 \(z_i = g_i(x)\) 均为自变量 \(x\) 的可微函数。根据多元微积分全微分公式：
  </p>
  \[ d\mathcal{L} = \sum_{i=1}^{k} \frac{\partial \mathcal{L}}{\partial z_i} dz_i \]
  <p>
    因为每个 \(z_i\) 仅由 \(x\) 变化引起的变化量满足一阶泰勒展开 \(dz_i = \frac{\partial z_i}{\partial x} dx\)，将此式代入全微分方程：
  </p>
  \[ d\mathcal{L} = \sum_{i=1}^{k} \frac{\partial \mathcal{L}}{\partial z_i} \left( \frac{\partial z_i}{\partial x} dx \right) = \left( \sum_{i=1}^{k} \frac{\partial \mathcal{L}}{\partial z_i} \frac{\partial z_i}{\partial x} \right) dx \]
  <p>
    两端同时除以微元 \(dx\)，立即得到计算图自动微分的根本公理：
  </p>
  \[ \frac{\partial \mathcal{L}}{\partial x} = \sum_{z \in \mathrm{Children}(x)} \frac{\partial \mathcal{L}}{\partial z} \cdot \frac{\partial z}{\partial x} \]
  <p>
    <strong>数学结论与工程映射</strong>：
    当一个节点 \(x\) 被多个子节点引用时，它对最终损失 \(\mathcal{L}\) 的总偏导数，
    <strong>等于沿每一条流出路径回传的梯度贡献之和</strong>。
    这也是为什么在写自动微分引擎时，节点的反向传播更新必须是 <code>self.grad += ...</code> 而绝不能是 <code>self.grad = ...</code>！
    如果误写为赋值，后遍历到的分支就会将先前的梯度无情覆盖，导致求导数学错误。
  </p>
</section>

<section class="blk blk-m">
  <h4><span class="ic">∑</span>经典算例：分叉节点的梯度手算验证</h4>
  <p>
    考虑一个最简单的分叉图：令输入 \(x = 3.0\)。定义两个分支：
  </p>
  \[ a = 2x, \qquad b = x^2, \qquad \mathcal{L} = a \cdot b \]
  <p><strong>第一步：解析复合函数直接求导</strong></p>
  \[ \mathcal{L}(x) = (2x) \cdot (x^2) = 2x^3 \implies \frac{d\mathcal{L}}{dx} = 6x^2 \]
  <p>代入数值 \(x = 3.0\)：\(\frac{d\mathcal{L}}{dx} = 6 \times 3^2 = 54.0\)。</p>

  <p><strong>第二步：按多元链式法则分步回溯</strong></p>
  <ol>
    <li>前向输出：\(a = 2 \times 3 = 6.0\)，\(b = 3^2 = 9.0\)，\(\mathcal{L} = 6.0 \times 9.0 = 54.0\)；</li>
    <li>损失对输出自身的基底梯度：\(\frac{\partial \mathcal{L}}{\partial \mathcal{L}} = 1.0\)；</li>
    <li>损失对两分支的偏导：\(\frac{\partial \mathcal{L}}{\partial a} = b = 9.0\)，\(\frac{\partial \mathcal{L}}{\partial b} = a = 6.0\)；</li>
    <li>分支对输入 \(x\) 的局部导数：\(\frac{\partial a}{\partial x} = 2.0\)，\(\frac{\partial b}{\partial x} = 2x = 6.0\)；</li>
    <li>求和汇总：
      \[ \frac{\partial \mathcal{L}}{\partial x} = \frac{\partial \mathcal{L}}{\partial a} \frac{\partial a}{\partial x} + \frac{\partial \mathcal{L}}{\partial b} \frac{\partial b}{\partial x} = 9.0 \times 2.0 + 6.0 \times 6.0 = 18.0 + 36.0 = 54.0 \]
    </li>
  </ol>
  <p>两种推导结果严丝合缝。链式法则的精髓正是将一个庞大的全局求导问题，拆解为图上各节点<strong>局部偏导数的局部相乘与汇聚相加</strong>。</p>
</section>

<h3>3. 为什么必须是拓扑排序？（Topological Sort）</h3>
<p>
  在前向传播中，节点依赖关系要求：一个节点必须在它的所有父节点计算完毕后才能计算。
  反向传播则完全相反：<strong>一个节点必须在它所有的子节点（也就是所有消费了它输出的节点）的梯度全部回传就绪后，才能计算自身的总梯度</strong>。
</p>
<p>
  如果遍历顺序随意发生颠倒，例如节点 \(z\) 还没有累加完来自 \(L\) 的全部贡献，就急于将自己的 <code>grad</code> 传递给输入 \(x\)，
  那么回传给 \(x\) 的梯度将是不完整的。
  计算机科学中保证这一严格依赖次序的算法正是<strong>拓扑排序（Topological Sort）</strong>。
  在有向无环图中，通过后序深度优先搜索（Post-order DFS）即可高效生成拓扑序列，其反转序列便是完美的反向传播执行序列。
</p>

<h3>4. 教科书级实现：Karpathy micrograd 标量引擎逐行解构</h3>
<p>
  以下是包含计算图构建、自动拓扑排序与多元链式求导的纯 Python 完整实现：
</p>

<pre><code><span class="kw">class</span> <span class="hi">Value</span>:
    <span class="st">"""带有标量值与梯度的计算图节点"""</span>
    <span class="kw">def</span> __init__(self, data, _children=(), _op=<span class="st">''</span>):
        <span class="cm"># [逐行剖析] 节点存储的核心标量数据（浮点数）</span>
        self.data = float(data)
        <span class="cm"># [逐行剖析] 该节点关于最终 Loss 的偏导数 dL/d(self)，初始化为 0.0</span>
        self.grad = 0.0
        <span class="cm"># [逐行剖析] 局部反向传播闭包：定义当前算子如何将自身梯度推演给父节点</span>
        self._backward = <span class="kw">lambda</span>: None
        <span class="cm"># [逐行剖析] 记录前驱节点集合（图的边），用于拓扑排序遍历</span>
        self._prev = set(_children)
        <span class="cm"># [逐行剖析] 记录生成该节点的运算符号（调试与可视化用）</span>
        self._op = _op

    <span class="kw">def</span> __add__(self, other):
        <span class="cm"># [逐行剖析] 支持与常数相加：若 other 不是 Value 则封装为常量 Value</span>
        other = other <span class="kw">if</span> isinstance(other, Value) <span class="kw">else</span> Value(other)
        out = Value(self.data + other.data, (self, other), <span class="st">'+'</span>)

        <span class="kw">def</span> _backward():
            <span class="cm"># [逐行剖析] 加法规则：z = x + y => dz/dx = 1, dz/dy = 1</span>
            <span class="cm"># 核心细节：必须使用 += 累加梯度，以正确实现多元微积分链式法则</span>
            self.grad += 1.0 * out.grad
            other.grad += 1.0 * out.grad
        out._backward = _backward
        <span class="kw">return</span> out

    <span class="kw">def</span> __mul__(self, other):
        other = other <span class="kw">if</span> isinstance(other, Value) <span class="kw">else</span> Value(other)
        out = Value(self.data * other.data, (self, other), <span class="st">'*'</span>)

        <span class="kw">def</span> _backward():
            <span class="cm"># [逐行剖析] 乘法乘积法则：z = x * y => dz/dx = y, dz/dy = x</span>
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        <span class="kw">return</span> out

    <span class="kw">def</span> __pow__(self, power):
        <span class="cm"># [逐行剖析] 幂运算：z = x ** n => dz/dx = n * (x ** (n - 1))</span>
        <span class="kw">assert</span> isinstance(power, (int, float)), <span class="st">"只支持标量幂次"</span>
        out = Value(self.data ** power, (self,), f<span class="st">'**{power}'</span>)

        <span class="kw">def</span> _backward():
            self.grad += (power * (self.data ** (power - 1))) * out.grad
        out._backward = _backward
        <span class="kw">return</span> out

    <span class="kw">def</span> relu(self):
        <span class="cm"># [逐行剖析] 激活函数 ReLU：z = max(0, x) => dz/dx = 1 if x > 0 else 0</span>
        out = Value(max(0.0, self.data), (self,), <span class="st">'ReLU'</span>)

        <span class="kw">def</span> _backward():
            self.grad += (1.0 <span class="kw">if</span> self.data > 0.0 <span class="kw">else</span> 0.0) * out.grad
        out._backward = _backward
        <span class="kw">return</span> out

    <span class="kw">def</span> backward(self):
        <span class="cm"># [逐行剖析] 1. 后序 DFS 构造拓扑排序列表（Topological Sort）</span>
        topo = []
        visited = set()
        <span class="kw">def</span> build_topo(v):
            <span class="kw">if</span> v <span class="kw">not in</span> visited:
                visited.add(v)
                <span class="kw">for</span> child <span class="kw">in</span> v._prev:
                    build_topo(child)
                topo.append(v)
        build_topo(self)

        <span class="cm"># [逐行剖析] 2. 损失函数关于自身的基底梯度为 dL/dL = 1.0</span>
        self.grad = 1.0

        <span class="cm"># [逐行剖析] 3. 逆序遍历拓扑图，确保每个节点的子节点全部就绪后才执行 _backward()</span>
        <span class="kw">for</span> node <span class="kw">in</span> reversed(topo):
            node._backward()</code></pre>

<section class="blk blk-lab">
  <h4><span class="ic">🧪</span>动手验证：有限差分梯度检验 (Numerical Gradient Check)</h4>
  <p>
    为了验证纯 Python 引擎的求导正确性，我们可以利用微积分导数定义中的对称中心差商：
  </p>
  \[ f'(x) = \lim_{\epsilon \to 0} \frac{f(x + \epsilon) - f(x - \epsilon)}{2\epsilon} + O(\epsilon^2) \]
  <p>
    运行以下脚本，比对解析梯度与数值有限差分梯度：
  </p>
<pre><code><span class="cm"># 1. 自动微分求解析梯度</span>
x = Value(3.0)
a = x * 2.0
b = x ** 2
L = a * b
L.backward()
analytic_grad = x.grad  <span class="cm"># 应精确等于 54.0</span>

<span class="cm"># 2. 对称有限差分求数值梯度</span>
eps = 1e-6
f = <span class="kw">lambda</span> val: (val * 2.0) * (val ** 2)
numeric_grad = (f(3.0 + eps) - f(3.0 - eps)) / (2 * eps)

print(f"Analytic grad: {analytic_grad:.6f}")
print(f"Numeric grad:  {numeric_grad:.6f}")
rel_error = abs(analytic_grad - numeric_grad) / max(1.0, abs(analytic_grad))
print(f"Relative Error: {rel_error:.2e}")
<span class="kw">assert</span> rel_error &lt; 1e-5, "梯度检验未通过！"</code></pre>
</section>

<h3>5. 从标量到向量：Logits、Softmax 与交叉熵损失</h3>
<p>
  在语言模型中，最后一层的输出是一个高维向量，其维度等于词表大小 \(|\mathcal{V}|\)。
  模型直接输出的无约束实数向量称为 <span class="t" data-tterm="Logits" data-d="softmax 之前的原始实数输出，可以取任意实数值（正、负、零），不是概率。">Logits</span> \(z \in \mathbb{R}^{|\mathcal{V}|}\)。
  为了把任意实数映射为满足概率公理的非负单位和分布，引入了 Softmax 算子：
</p>
\[ p_i = \frac{e^{z_i}}{\sum_{j=1}^{|\mathcal{V}|} e^{z_j}} \]

<section class="blk blk-m">
  <h4><span class="ic">∑</span>手算一次 Softmax 与交叉熵（跟算一遍）</h4>
  <p>
    假设词表中只有 3 个词：<code>["apple", "banana", "cat"]</code>，模型前向输出的 logits 为：
  </p>
  \[ z = [2.0, \quad 1.0, \quad 0.1] \]
  <p><strong>步骤一：求指数（拉到非负实数域）</strong></p>
  \[ e^{2.0} \approx 7.3891, \qquad e^{1.0} \approx 2.7183, \qquad e^{0.1} \approx 1.1052 \]
  <p><strong>步骤二：求配分函数（分母归一化和）</strong></p>
  \[ \sum_{j} e^{z_j} = 7.3891 + 2.7183 + 1.1052 = 11.2126 \]
  <p><strong>步骤三：逐元素归一化</strong></p>
  \[ p = \left[ \frac{7.3891}{11.2126}, \; \frac{2.7183}{11.2126}, \; \frac{1.1052}{11.2126} \right] \approx [0.6590, \; 0.2424, \; 0.0986] \]
  <p><strong>步骤四：计算负对数似然损失（NLL Loss）</strong></p>
  <p>
    如果真实标签（Ground Truth）是 <code>"apple"</code>（索引 0）：
  </p>
  \[ \mathcal{L} = -\ln p_0 = -\ln(0.6590) \approx 0.4170 \]
  <p>
    但若真实标签是 <code>"cat"</code>（索引 2）：
  </p>
  \[ \mathcal{L} = -\ln p_2 = -\ln(0.0986) \approx 2.3167 \]
  <p>
    <strong>几何意义直觉</strong>：模型对正确类别的置信度越低，惩罚越呈现爆炸式增长。
    当正确类别的概率趋近于 0 时，损失趋向无穷大 \(-\ln(0^+) = +\infty\)。
    这迫使模型在反向传播时向正确类别的 Logit 注入极大的上升梯度。
  </p>
</section>

<h3>6. 梯度下降动力学：山谷中的步长与振荡</h3>
<p>
  优化器拿着所有参数的偏导数向量 \(\nabla_{\mathbf{w}} \mathcal{L}\)，执行一阶梯度更新：
</p>
\[ \mathbf{w}^{(t+1)} = \mathbf{w}^{(t)} - \eta \, \nabla_{\mathbf{w}} \mathcal{L} \]
<p>
  标量 \(\eta\) 为<span class="t" data-tterm="Learning rate" data-d="梯度下降步长参数。太小则收敛过慢，太大则可能在损失曲面峡谷两壁发散甚至产生 NaN。">学习率</span>。
  考虑一个一维凸抛物面玩具模型 \(f(w) = (w - 3)^2\)，导数为 \(f'(w) = 2(w - 3)\)，最优解在 \(w^* = 3\)。
  下表直观揭示了学习率取值对收敛轨迹的决定性影响：
</p>

<table class="tbl small">
  <thead>
    <tr>
      <th>步数</th>
      <th>当前 \(w\)</th>
      <th>梯度 \(f'(w)\)</th>
      <th>小步长更新 (\(\eta=0.1\))</th>
      <th>临界步长 (\(\eta=1.0\))</th>
      <th>发散步长 (\(\eta=1.1\))</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>0.00</td>
      <td>-6.00</td>
      <td>\(w_1 = 0 - 0.1(-6) = 0.60\)</td>
      <td>\(w_1 = 0 - 1.0(-6) = 6.00\)</td>
      <td>\(w_1 = 0 - 1.1(-6) = 6.60\)</td>
    </tr>
    <tr>
      <td>1</td>
      <td>-</td>
      <td>-</td>
      <td>\(w_2 = 0.6 - 0.1(-4.8) = 1.08\)</td>
      <td>\(w_2 = 6 - 1.0(6) = 0.00\) (永久横跳)</td>
      <td>\(w_2 = 6.6 - 1.1(7.2) = -1.32\) (震荡发散)</td>
    </tr>
    <tr>
      <td>2</td>
      <td>-</td>
      <td>-</td>
      <td>\(w_3 = 1.08 - 0.1(-3.84) = 1.464\)</td>
      <td>\(w_3 = 0.00\)</td>
      <td>\(w_3 = 8.35\) (爆炸)</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">⚠</span>STEP 级思考题：李普希茨常数与最大学习率界限</h4>
  <p>
    设损失函数二阶连续可微，若其梯度的李普希茨常数为 \(L_{\text{Lip}}\)（即海森矩阵最大特征值 \(\lambda_{\max}(\nabla^2 f) \le L_{\text{Lip}}\)）。
    对于函数 \(f(w) = a(w - w^*)^2\)，其海森矩阵标量为 \(2a\)。
    根据压缩映射原理，迭代式 \(w_{t+1} = w_t - \eta \cdot 2a(w_t - w^*)\) 能够单调收敛的充分必要条件为：
  </p>
  \[ |1 - 2a\eta| < 1 \iff 0 < \eta < \frac{1}{a} = \frac{2}{L_{\text{Lip}}} \]
  <p>
    当 \(\eta = \frac{1}{a}\) 时系统进入二维周期轨道（在对称点横跳）；当 \(\eta > \frac{1}{a}\) 时系统动力学失稳发散。
    这就是大型模型训练中如果学习率过高会导致损失瞬间变成 <code>NaN</code> 的根本数学原因。
  </p>
</section>

<h3>7. 组合成完整的训练循环</h3>
<p>
  上述所有模块组合在一起，就构成了现代大语言模型最基础的训练微循环：
</p>

<pre><code><span class="cm"># [逐行剖析] 纯 Python 极简训练微循环伪代码</span>
<span class="kw">for</span> step <span class="kw">in</span> range(max_steps):
    <span class="cm"># 1. 获取批次数据（输入序列 x 与右移错位一格的目标 y）</span>
    x, y = get_batch()
    
    <span class="cm"># 2. 前向传播：计算整张图各个内部节点，最终输出未归一化的 Logits</span>
    logits = model(x)
    
    <span class="cm"># 3. 概率转换与损失评估：Softmax + 负对数似然</span>
    probs = softmax(logits)
    loss = -probs[y].log().mean()
    
    <span class="cm"># 4. 反向传播准备：梯度清零（防止上一迭代残余梯度通过 += 错误累加）</span>
    model.zero_grad()
    
    <span class="cm"># 5. 反向传播：基于拓扑排序逆序回溯多元链式法则，算出 dLoss/dw</span>
    loss.backward()
    
    <span class="cm"># 6. 参数更新：沿负梯度方向迈出微调步伐</span>
    <span class="kw">for</span> param <span class="kw">in</span> model.parameters():
        param.data -= learning_rate * param.grad</code></pre>

<section class="blk blk-eco">
  <h4><span class="ic">◈</span>怎么连通工业级训练：万亿大模型与微型计算图的同一性</h4>
  <p>
    亲手跑完这 50 行纯 Python 的 <code>Value</code> 引擎后，你可能会好奇：工业界主流的 PyTorch（例如 <code>torch.Tensor</code>）究竟比我们手写的高级在哪里？
  </p>
  <p>
    <strong>答案是：数学内核完全一致，唯一的差异在于硬件并行与内存吞吐。</strong>
    PyTorch 不对一个个孤独的标量做计算，而是把成千上万个标量打包成连续显存块（张量 Tensor），
    并将求导运算编译进底层 CUDA 核心。你在现代大模型代码中调用 <code>loss.backward()</code> 时，
    底层的 <code>torch.autograd</code> 引擎做的事情，依然是在由算子拼接而成的有向无环图上执行拓扑排序，
    并把误差沿着多元微积分链式法则逆序累加给每一个参数的 <code>.grad</code> 缓冲区。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">模型给正确答案分配的概率是 \(0.5\)，这个位置的损失是多少？</p>
  <ul class="opts">
    <li>0.5</li>
    <li data-ok>约 0.693</li>
    <li>0</li>
    <li>无法计算</li>
  </ul>
  <p class="why">
    \(-\ln 0.5 \approx 0.693\)。记住这个基准数字：<strong>概率 0.5 对应损失约 0.69 nats</strong>，它是二元猜测或均等纠结时的重要参考点。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">为什么神经网络每一层之间必须要夹入非线性激活函数（如 ReLU、GELU）？</p>
  <ul class="opts">
    <li>为了让前向计算速度更快</li>
    <li data-ok>因为若干线性变换复合起来仍然是线性变换，多层就退化等价于单层</li>
    <li>为了减少网络参数量</li>
    <li>为了专门处理中文字符</li>
  </ul>
  <p class="why">
    设层变换为 \(f_1(x) = W_1 x\)，\(f_2(h) = W_2 h\)，若无激活函数，则 \(f_2(f_1(x)) = (W_2 W_1) x = W' x\)，无论叠加多少层其表现力等价于单层矩阵乘法。夹入非线性激活函数后，网络才具备万能函数近似（Universal Approximation）的能力。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">下面哪件事<strong>不属于</strong>训练循环内部每一个迭代 step 必须执行的步骤？</p>
  <ul class="opts">
    <li>前向计算得到 logits</li>
    <li>计算损失值 Loss</li>
    <li data-ok>把每个参数都手动设定一个初值范围并逐个检查</li>
    <li>反向传播得到梯度并更新参数</li>
  </ul>
  <p class="why">
    权重初始化（如 Kaiming 或 Xavier 初始化）是训练启动前仅需执行一次的操作，绝不属于训练循环内部的迭代步骤。训练循环内只有：取 Batch → 前向 → 算 Loss → 梯度清零 → 反向回溯 → 优化器单步更新。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 4</div>
  <p class="q">在玩具凸函数 \(f(w) = (w - 3)^2\) 的例子中，若从 \(w = 0\) 出发，但将学习率设为临界值 \(\eta = 1.0\)，会发生什么现象？</p>
  <ul class="opts">
    <li>收敛更快，一步达到最优点 3</li>
    <li data-ok>更新后 \(w = 0 - 1.0 \times (-6) = 6\)，越过最优点 3 到另一侧 3 的位置，来回横跳</li>
    <li>损失立刻变成 0</li>
    <li>参数不再更新</li>
  </ul>
  <p class="why">
    当 \(\eta = 1.0\) 时，第一步由 \(0\) 跳到 \(6\)；第二步梯度 \(f'(6) = 2(6 - 3) = 6\)，更新为 \(6 - 1.0 \times 6 = 0\)。参数在 \(0\) 和 \(6\) 之间发生等幅振荡，永远无法收敛至极小值点 \(3\)。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 5</div>
  <p class="q">在 micrograd 类的计算图中，若自变量 \(x\) 的输出同时传递给两个节点 \(y_1 = x^2\) 和 \(y_2 = 3x\)，最终损失为 \(\mathcal{L} = y_1 + y_2\)。反向传播时 \(x\) 节点的梯度更新操作必须如何实现？</p>
  <ul class="opts">
    <li><code>x.grad = (2*x.data + 3.0)</code>，不需要累加</li>
    <li><code>x.grad = max(y1.grad, y2.grad)</code></li>
    <li data-ok><code>x.grad += dL/dy1 * dy1/dx</code> 并在另一分支回传时继续执行 <code>x.grad += dL/dy2 * dy2/dx</code></li>
    <li>先计算左子树更新，右子树直接覆盖</li>
  </ul>
  <p class="why">
    根据多元微积分全微分定理与链式法则，当变量分叉时，总导数等于各路径导数贡献的线性累加。因此底层代码必须使用 <code>x.grad += ...</code> 累加所有后继节点的反向梯度贡献。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 6</div>
  <p class="q">在执行标量自动微分引擎的 <code>backward()</code> 时，为什么必须先对计算图执行拓扑排序并逆序遍历？</p>
  <ul class="opts">
    <li>为了节省内存消耗</li>
    <li data-ok>确保任何一个节点在计算自身局部反向梯度前，其所有消费子节点的梯度贡献均已完全计算并累加完毕</li>
    <li>为了让 GPU 可以完全并行化执行</li>
    <li>防止图中出现自环</li>
  </ul>
  <p class="why">
    在计算图中，反向传播的依赖关系方向与前向完全相反。若不保证拓扑逆序，某个节点可能在尚未接收完所有下游分支的梯度回传时就提前触发了自己的反向传递，导致上游祖先节点接收到的梯度严重缺损。
  </p>
</div>
`
});
