/* content/92-appendix-c-resources.js — 附录 C：资源地图与阅读路径 */
COURSE.register({
  id: "appC",
  part: 9,
  num: "C",
  title: "附录 C · 资源地图与阅读路径",
  en: "Appendix C — Resource Map",
  minutes: 60,
  tags: ["附录", "资源", "阅读路径"],
  body: String.raw`
<p class="lead">
  构建大模型与现代深度学习的知识大厦，绝非孤立地调用几个现成 API，而是要在<strong>数学底座、架构解构、训练动力学与基础设施</strong>四大支柱之间建立起第一性原理的内在逻辑闭环。
  本附录精选沉淀了 <strong>160 篇世界顶级学术与开源工程信源</strong>（涵盖 DeepMind、OpenAI、Anthropic、Meta FAIR、Stanford CS224N/CS336、CMU 等前沿权威研究），
  紧扣深度学习数学原理、系统架构与训练落地，给出体系化的研读图谱。
</p>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>信源研读第一法则：分层透视</h4>
  <p>
    面对浩瀚的前沿文献，必须建立严谨的<strong>文献阅读分级标准</strong>：<br />
    1. <strong>公理与定理（数学底座）</strong>：不仅读结论，必须推导证明过程，寻找其在物理系统（如音频能量守恒、相空间稳定性）中的几何映射。<br />
    2. <strong>算子与等价性（架构解构）</strong>：洞察矩阵乘法的结合律变形（如线性注意力与状态空间对偶性），明确参数量、时间复杂度与显存复杂度的渐近阶。<br />
    3. <strong>优化与相变（训练动力学）</strong>：把握损失函数幂律缩放、海森矩阵曲率谱半径、以及低比特浮点数下梯度的数值动态范围。<br />
    4. <strong>物理与墙（基础设施）</strong>：时刻牢记访存带宽与通信延迟的物理天花板，任何优秀的算法设计都必须是体系结构友好的（Hardware-aware）。
  </p>
</section>

<h3>1. 160+ 顶级高质信源全景图谱</h3>

<h4>1.1 支柱一 · 数学底座（线性代数、谱理论、最优化、测度与动力系统 40 篇）</h4>
<p>
  数学是穿透技术泡沫的唯一 X 光。大模型中的注意力机制、低秩分解、位置旋转与流匹配，本质上是泛函分析、微分几何与高维统计在有限精度浮点数上的投影运算。
</p>
<table class="tbl small">
  <thead><tr><th>序号</th><th>文献 / 课程 / 报告</th><th>机构 / 作者</th><th>核心数学与工程结论</th><th>核心数学与研读启示</th></tr></thead>
  <tbody>
    <tr>
      <td><code>#001</code></td>
      <td><strong><a href="https://math.mit.edu/~gs/learningfromdata/" target="_blank" rel="noopener">Linear Algebra and Learning from Data</a></strong></td>
      <td>Gilbert Strang (MIT)</td>
      <td>深度网络前向即仿射映射与非线性激活的交替复合；证明了低秩近似奇异值分解（SVD）是酉不变范数下的最优截断，揭示了权重矩阵谱范数对梯度流稳定的主导作用。</td>
      <td>线性代数与主成分分析基石。指导权重矩阵的低秩分解，理解特征值谱衰减与模型参数冗余度的数学本质。</td>
    </tr>
    <tr>
      <td><code>#002</code></td>
      <td><strong><a href="https://epubs.siam.org/doi/book/10.1137/1.9780898719574" target="_blank" rel="noopener">Numerical Linear Algebra</a></strong></td>
      <td>Lloyd N. Trefethen & David Bau III (Oxford)</td>
      <td>数值稳定性的经典判据：条件数 kappa(A) 与后向误差分析。浮点矩阵乘累加中的舍入误差如何通过 QR 分解与 Householder 变换得到数值正交控制。</td>
      <td>数值分析核心参考。指导深度学习混合精度训练与累加误差界定，理解正交化过程在防止数值下溢中的作用。</td>
    </tr>
    <tr>
      <td><code>#003</code></td>
      <td><strong><a href="https://terrytao.wordpress.com/books-and-preprints/topics-in-random-matrix-theory/" target="_blank" rel="noopener">Topics in Random Matrix Theory</a></strong></td>
      <td>Terence Tao (UCLA)</td>
      <td>严格证明了半圆律（Wigner Semicircular Law）与马尔琴科-帕斯图尔分布（Marchenko-Pastur Law），奠定了高维随机初始化权重谱半径收敛特性的数学基石。</td>
      <td>理解 Transformer 权重初始化（如 Xavier / He 初始化）时奇异值分布的本质；防范注意力投影矩阵在超大序列下由于极端奇异值导致的局部激活坍缩。</td>
    </tr>
    <tr>
      <td><code>#004</code></td>
      <td><strong><a href="https://www.cambridge.org/core/books/matrix-analysis/811A1B2D3A1F4C1B62C2E1F8C8A3B2A1" target="_blank" rel="noopener">Matrix Analysis (2nd Edition)</a></strong></td>
      <td>Roger A. Horn & Charles R. Johnson (Johns Hopkins)</td>
      <td>佩隆-弗罗贝尼乌斯定理（Perron-Frobenius）、舒尔补（Schur Complement）与正定矩阵偏序（Loewner Order）的标准参考书。</td>
      <td>马尔可夫链与非负矩阵谱理论。严密分析 Softmax 概率矩阵的本征值分布与自回归收敛性。</td>
    </tr>
    <tr>
      <td><code>#005</code></td>
      <td><strong><a href="https://link.springer.com/article/10.1007/BF02288367" target="_blank" rel="noopener">The Approximation of One Matrix by Another of Lower Rank</a></strong></td>
      <td>Carl Eckart & Gale Young (Psychometrika)</td>
      <td>埃卡特-扬-米尔斯基定理（Eckart-Young-Mirsky Theorem）：任意矩阵 A 在 Frobenius 范数和谱范数下的最优 rank-k 近似由截断 SVD 给出。</td>
      <td>低秩近似与矩阵流形。严格证明权重增量矩阵在内在维度较小时可无损压缩至微小秩子空间的理论基础。</td>
    </tr>
    <tr>
      <td><code>#006</code></td>
      <td><strong><a href="https://web.stanford.edu/~boyd/cvxbook/" target="_blank" rel="noopener">Convex Optimization</a></strong></td>
      <td>Stephen Boyd & Lieven Vandenberghe (Stanford)</td>
      <td>凸集、凸函数、对偶理论与 KKT 条件的现代经典。证明了次梯度法与拉格朗日乘子法在有约束优化中的全局收敛性。</td>
      <td>凸优化与拉格朗日乘子法经典范例。求解带等式与不等式约束下的全局最优参数配置。</td>
    </tr>
    <tr>
      <td><code>#007</code></td>
      <td><strong><a href="https://link.springer.com/book/10.1007/978-1-4419-8853-9" target="_blank" rel="noopener">Introductory Lectures on Convex Optimization</a></strong></td>
      <td>Yurii Nesterov (UC Louvain)</td>
      <td>证明了一阶黑盒平滑凸优化算法收敛下界为 O(1/k^2)，并提出了 Nesterov 加速梯度法（NAG），奠定了动量优化器的理论上限。</td>
      <td>理解 AdamW 中动量系数 beta_1 的加速几何机理。在音频过渡平滑度优化中引入 Nesterov 动量阻尼，避免曲线产生多余的高频振铃。</td>
    </tr>
    <tr>
      <td><code>#008</code></td>
      <td><strong><a href="https://www.sciencedirect.com/science/article/abs/pii/0041555364901375" target="_blank" rel="noopener">Some Methods of Speeding Up the Convergence of Iteration Methods</a></strong></td>
      <td>Boris T. Polyak (USSR Academy of Sciences)</td>
      <td>提出了重球法（Heavy-Ball Method），利用二阶常微分方程的物理阻尼振子类比，证明了在二次强凸函数上动量对谱间隙收敛速度的提升。</td>
      <td>将优化算法映射为物理阻尼动力系统。严格推导带动量的动能守恒与李雅普诺夫稳定性收敛。</td>
    </tr>
    <tr>
      <td><code>#009</code></td>
      <td><strong><a href="https://www.cambridge.org/core/books/optimization-for-data-analysis/9781108488884" target="_blank" rel="noopener">Optimization for Data Analysis</a></strong></td>
      <td>Stephen J. Wright & Benjamin Recht (Wisconsin / Berkeley)</td>
      <td>现代数据科学中的非凸随机最优化、流形优化与坐标下降法，系统探讨了随机梯度方差与批大小（Batch Size）的缩放关系。</td>
      <td>理解大模型分布式训练中大批次梯度噪声尺度（Gradient Noise Scale）的数学本质，帮助把控微调与后训练学习率调度策略。</td>
    </tr>
    <tr>
      <td><code>#010</code></td>
      <td><strong><a href="https://epubs.siam.org/doi/10.1137/16M1080173" target="_blank" rel="noopener">Optimization Methods for Large-Scale Machine Learning</a></strong></td>
      <td>Léon Bottou, Frank E. Curtis, Jorge Nocedal (SIAM Review)</td>
      <td>深度学习大规模随机梯度方法（SGD、动量法、自适应学习率算法）的系统收敛性定理，厘清了样本噪声与二阶曲率估计的权衡。</td>
      <td>为模型阶梯中参数微调与损失震荡提供理论诊断依据，指导如何选择从 AdamW 到 SGD 的最优化切换节点。</td>
    </tr>
    <tr>
      <td><code>#011</code></td>
      <td><strong><a href="https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X" target="_blank" rel="noopener">Elements of Information Theory (2nd Edition)</a></strong></td>
      <td>Thomas M. Cover & Joy A. Thomas (Stanford)</td>
      <td>香农熵、互信息、Kullback-Leibler 散度、微分熵与数据处理不等式（Data Processing Inequality）的严格公理化体系。</td>
      <td>信息论根基文献。严格推导香农信息熵、自信息与交叉熵在统计推断中的测度唯一性。</td>
    </tr>
    <tr>
      <td><code>#012</code></td>
      <td><strong><a href="https://www.inference.org.uk/itprnn/book.html" target="_blank" rel="noopener">Information Theory, Inference, and Learning Algorithms</a></strong></td>
      <td>David J.C. MacKay (Cambridge, Cavendish Laboratory)</td>
      <td>剑桥大学前沿教材：将贝叶斯推断、信道编码与神经网络统一在统计物理吉布斯分布框架下，深入剖析了变分自由能与最大后验估计。</td>
      <td>Charles 申请剑桥数学系（Cavendish/DAMTP 传统）必读书目。理解模型后验不确定性，将音频响度平滑（LUFS）与贝叶斯先验约束紧密结合。</td>
    </tr>
    <tr>
      <td><code>#013</code></td>
      <td><strong><a href="https://link.springer.com/book/10.1007/978-3-540-71050-9" target="_blank" rel="noopener">Optimal Transport: Old and New</a></strong></td>
      <td>Cédric Villani (Fields Medalist, ENS Lyon)</td>
      <td>蒙日-坎托罗维奇最优传输问题（Monge-Kantorovich Problem）的测度几何权威专著，严格定义了 Wasserstein 距离与位移插值（Displacement Interpolation）。</td>
      <td>现代最优传输理论经典。用测地线距离替代朴素欧氏距离，度量概率测度之间的几何流形位移。</td>
    </tr>
    <tr>
      <td><code>#014</code></td>
      <td><strong><a href="https://proceedings.neurips.cc/paper/2013/file/af21d60519c4203fcf52e204647e3240-Paper.pdf" target="_blank" rel="noopener">Sinkhorn Distances: Lightspeed Computation of Optimal Transport</a></strong></td>
      <td>Marco Cuturi (NeurIPS / Google DeepMind)</td>
      <td>通过引入熵正则化（Entropy Regularization），利用矩阵缩放 Sinkhorn-Knopp 算法，将最优传输的求解复杂度从多项式降至矩阵向量乘法，完全可微并可在 GPU 上并行。</td>
      <td>为长序列注意力软对齐提供可微测度映射支持；在音频特征空间中快速对齐两首歌曲的主节拍（BPM / Beat Grid）的最佳算法支撑。</td>
    </tr>
    <tr>
      <td><code>#015</code></td>
      <td><strong><a href="https://projecteuclid.org/journals/annals-of-mathematical-statistics/volume-22/issue-1/On-Information-and-Sufficiency/10.1214/aoms/1177729694.full" target="_blank" rel="noopener">On Information and Sufficiency</a></strong></td>
      <td>Solomon Kullback & Richard A. Leibler (Annals of Math Statistics)</td>
      <td>定义了两概率测度间的信息散度 D_KL(P||Q)，证明了非负性（吉布斯不等式）以及与充分统计量的充要条件关系。</td>
      <td>大模型蒸馏（Soft Distillation）与偏好优化（DPO）损失函数项中先验反向惩罚项的原始公理出处，深入剖析模式覆盖与模式崩塌的根本根源。</td>
    </tr>
    <tr>
      <td><code>#016</code></td>
      <td><strong><a href="https://rss.onlinelibrary.wiley.com/doi/abs/10.1111/j.2517-6161.1966.tb00626.x" target="_blank" rel="noopener">A General Class of Coefficients of Divergence of One Distribution from Another</a></strong></td>
      <td>S. M. Ali & S. D. Silvey (JRSS)</td>
      <td>统一了 f-散度（f-Divergence）族（KL 散度、反向 KL、JS 散度、总变差范数 TV、Hellinger 距离），给出共轭凸函数刻画与凸松弛性质。</td>
      <td>对齐算法中对 DPO 与 KTO 的损失偏好进行凸分析对比，明确在极端偏好比值下梯度的饱和上界。</td>
    </tr>
    <tr>
      <td><code>#017</code></td>
      <td><strong><a href="https://arxiv.org/abs/1806.07366" target="_blank" rel="noopener">Neural Ordinary Differential Equations</a></strong></td>
      <td>Ricky T. Q. Chen et al. (Toronto, NeurIPS Best Paper)</td>
      <td>将无限深残差网络建模为常微分方程初值问题（ODE IVP）dh(t)/dt = f(h(t), t, theta)，利用连续伴随灵敏度方法（Adjoint Method）实现 O(1) 显存反向传播。</td>
      <td>将深度残差网络连续化为常微分方程流。利用伴随状态法（Adjoint State Method）在常数内存下反向传播求导。</td>
    </tr>
    <tr>
      <td><code>#018</code></td>
      <td><strong><a href="https://www.routledge.com/Nonlinear-Dynamics-and-Chaos-With-Applications-to-Physics-Biology-Chemistry/Strogatz/p/book/9780813349107" target="_blank" rel="noopener">Nonlinear Dynamics and Chaos</a></strong></td>
      <td>Steven H. Strogatz (Cornell)</td>
      <td>一阶与二阶非线性系统相空间分析、分岔理论（Saddle-node, Hopf）、极限环与李雅普诺夫指数稳定性判据的经典教材。</td>
      <td>剑桥自然科学/数学荣誉学位体系推荐必读。为 Transformer 隐状态演化轨迹提供相空间几何直觉；保证音频淡入淡出曲线不发生突变分岔。</td>
    </tr>
    <tr>
      <td><code>#019</code></td>
      <td><strong><a href="https://arxiv.org/abs/2210.02747" target="_blank" rel="noopener">Flow Matching for Generative Modeling</a></strong></td>
      <td>Yaron Lipman et al. (Meta FAIR / Weizmann)</td>
      <td>摒弃传统扩散模型的复杂前向加噪 SDE，通过连续最优传输条件概率路径（Optimal Transport Displacement Interpolation）直接回归目标速度场，实现确定性、直线化的流匹配。</td>
      <td>前沿生成扩散模型理论。在源先验分布与目标数据分布之间构建直达条件速度场，摆脱曲折布朗扩散。</td>
    </tr>
    <tr>
      <td><code>#020</code></td>
      <td><strong><a href="https://arxiv.org/abs/2011.13456" target="_blank" rel="noopener">Score-Based Generative Modeling through Stochastic Differential Equations</a></strong></td>
      <td>Yang Song et al. (Stanford / Google Brain, ICLR Outstanding Paper)</td>
      <td>统一了得分匹配（SGM）与去噪扩散概率模型（DDPM），建立了正向伊藤随机微分方程（SDE）与逆向时间反演 SDE 的等价性，推导出常微分方程对应物（Probability Flow ODE）。</td>
      <td>深化连续概率流与可积性理论理解。在音频降噪、跨谱渐变与谐波恢复中，利用逆向概率流 ODE 实现无抖动的高保真度时间重构。</td>
    </tr>
    <tr>
      <td><code>#021</code></td>
      <td><strong><a href="https://arxiv.org/abs/2104.13478" target="_blank" rel="noopener">Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges</a></strong></td>
      <td>Michael M. Bronstein et al. (Oxford / DeepMind)</td>
      <td>将深度学习模型（CNN、RNN、GNN、Transformer）统一在克莱因爱尔兰根纲领（Erlangen Programme）下：以对称群、群等变性（Equivariance）和不变性（Invariance）为第一性原理归纳偏差。</td>
      <td>剑桥纯数群论、微分流形与表示论背景的最佳切入点。音乐音频信号在时间平移（SO(1)）与频率音阶平移群下具有明确的对称性要求。</td>
    </tr>
    <tr>
      <td><code>#022</code></td>
      <td><strong><a href="https://arxiv.org/abs/1602.07576" target="_blank" rel="noopener">Group Equivariant Convolutional Networks</a></strong></td>
      <td>Taco S. Cohen & Max Welling (Amsterdam, ICML)</td>
      <td>将标准卷积从欧氏平移群 (R^2, +) 推广至离散旋转反射群 p4 / p4m，从代数结构上严格保证了特征映射在群变换下的自洽等变传递。</td>
      <td>群论与对称性在深度学习中的体现。分析平移、旋转与尺度变换下特征流形的等变表征。</td>
    </tr>
    <tr>
      <td><code>#023</code></td>
      <td><strong><a href="https://arxiv.org/abs/1101.2286" target="_blank" rel="noopener">Group Invariant Scattering</a></strong></td>
      <td>Stéphane Mallat (Collège de France, Comm. Pure Appl. Math)</td>
      <td>提出散射变换（Scattering Transform）：利用小波变换模量与局部积分算子构建群不变表征，严格证明了在紧支撑微分同胚扰动下的利普希茨连续性（Lipschitz Stability）。</td>
      <td>解决音乐信号在微小时域拉伸（Time-stretching）下传统短时傅里叶变换（STFT）相位剧烈震荡的数学良药，构建高稳定度音频过渡判据。</td>
    </tr>
    <tr>
      <td><code>#024</code></td>
      <td><strong><a href="https://link.springer.com/article/10.1007/BF02551274" target="_blank" rel="noopener">Approximation by Superpositions of a Sigmoidal Function</a></strong></td>
      <td>George Cybenko (Dartmouth, MCSS)</td>
      <td>万能逼近定理（Universal Approximation Theorem）原始证明：利用哈恩-巴拿赫定理（Hahn-Banach Theorem）与里斯表象定理，证明连续函数在紧集上可被单隐层网络一致逼近。</td>
      <td>泛函分析在神经网络中的标志性应用。剑桥纯数分析方向必懂证明逻辑；解释为何多项式或样条基函数也可以作为跨淡入淡出曲线的高保真拟合器。</td>
    </tr>
    <tr>
      <td><code>#025</code></td>
      <td><strong><a href="https://ieeexplore.ieee.org/document/256500" target="_blank" rel="noopener">Universal Approximation Bounds for Superpositions of a Sigmoidal Function</a></strong></td>
      <td>Andrew R. Barron (Yale, IEEE Trans IT)</td>
      <td>突破维数灾难：证明了对于频域具有一阶有限绝对矩的一类函数，双层神经网络的均方逼近误差收敛速率为 O(1/n)，与输入空间维度 d 无关。</td>
      <td>连续函数万能逼近定理的测度论扩展。证明两层前馈网络在紧集上的均匀收敛性与 Sobolev 范数误差界。</td>
    </tr>
    <tr>
      <td><code>#026</code></td>
      <td><strong><a href="https://link.springer.com/chapter/10.1007/978-3-319-21852-6_1" target="_blank" rel="noopener">On the Uniform Convergence of Relative Frequencies of Events to Their Probabilities</a></strong></td>
      <td>V. N. Vapnik & A. Ya. Chervonenkis (Theory of Probability)</td>
      <td>定义了 VC 维数与生长函数，给出了经验风险最小化（ERM）在独立同分布样本上一致收敛的有限样本泛化边界。</td>
      <td>统计学习理论经典。解释为何模型参数量远超数据样本时传统 VC 边界会发散，从而引出过参数化范式下的谱范数泛化分析。</td>
    </tr>
    <tr>
      <td><code>#027</code></td>
      <td><strong><a href="https://www.jmlr.org/papers/v3/bartlett02a.html" target="_blank" rel="noopener">Rademacher and Gaussian Complexities: Risk Bounds and Structural Results</a></strong></td>
      <td>Peter L. Bartlett & Shahar Mendelson (JMLR)</td>
      <td>提出基于经验拉德马赫复杂度（Rademacher Complexity）的泛化误差上界，通过数据依赖的复杂度测度摆脱了组合 VC 维的悲观界。</td>
      <td>可量化分析线性模型阶梯与核方法在音频训练集上的过拟合风险，提供置换检验之外的严密泛化理论支撑。</td>
    </tr>
    <tr>
      <td><code>#028</code></td>
      <td><strong><a href="https://www.cambridge.org/core/books/highdimensional-statistics/8A8C6B1F9F8B52D4D44A68B13D5E4C48" target="_blank" rel="noopener">High-Dimensional Statistics: A Non-Asymptotic Viewpoint</a></strong></td>
      <td>Martin J. Wainwright (UC Berkeley / MIT)</td>
      <td>高维统计学的圣经：次高斯随机变量（Sub-Gaussian）、集中不等式（Concentration Inequalities）、非渐近矩阵浓度界与稀疏线性模型恢复。</td>
      <td>高维统计与压缩感知核心文献。严格推导正则化项在稀疏参数恢复中的相位转换临界点。</td>
    </tr>
    <tr>
      <td><code>#029</code></td>
      <td><strong><a href="https://www.math.uci.edu/~rvershyn/papers/HDP-book/HDP-book.html" target="_blank" rel="noopener">High-Dimensional Probability: An Introduction with Applications in Data Science</a></strong></td>
      <td>Roman Vershynin (UC Irvine)</td>
      <td>现代概率论几何观：球体表面测度集中、约翰逊-林登施特劳斯引理（JL Lemma）、高维随机投影与协方差矩阵经验估计误差界。</td>
      <td>解释嵌入向量在超高维空间中“几乎彼此正交”的几何现象，为 Q/K 点积缩放因子 1/sqrt(d_k) 提供测度集中解释。</td>
    </tr>
    <tr>
      <td><code>#030</code></td>
      <td><strong><a href="https://projecteuclid.org/ebooks/institute-of-mathematical-statistics-lecture-notes-monograph-series/Group-representations-in-probability-and-statistics/toc/10.1214/lnms/1215467407" target="_blank" rel="noopener">Group Representations in Probability and Statistics</a></strong></td>
      <td>Persi Diaconis (Stanford)</td>
      <td>利用对称群 S_n 上的傅里叶分析解决洗牌与随机行走马尔可夫链混合时间问题，建立了代数表示论与统计随机过程的桥梁。</td>
      <td>展示纯数学群表示论如何攻克应用概率问题。与音频混音（如轨道重新排列与能量重新分配）的群对称性分析天然契合。</td>
    </tr>
    <tr>
      <td><code>#031</code></td>
      <td><strong><a href="https://www.mheducation.com/highered/product/real-complex-analysis-rudin/M9780070542341.html" target="_blank" rel="noopener">Real and Complex Analysis (3rd Edition)</a></strong></td>
      <td>Walter Rudin (Wisconsin-Madison)</td>
      <td>测度论、L^p 空间完备性、傅里叶变换的普朗歇尔定理（Plancherel Theorem）与柯西积分公式的标准奠基专著。</td>
      <td>傅里叶分析与希尔伯特空间泛函分析。普朗歇尔保距定理在频域变换与算子内积中的核心证明。</td>
    </tr>
    <tr>
      <td><code>#032</code></td>
      <td><strong><a href="https://www.wiley.com/en-us/Introductory+Functional+Analysis+with+Applications-p-9780471504597" target="_blank" rel="noopener">Introductory Functional Analysis with Applications</a></strong></td>
      <td>Erwin Kreyszig (Carleton)</td>
      <td>希尔伯特空间（Hilbert Space）、有界线性算子谱理论、紧自伴算子的谱分解定理（Spectral Theorem）。</td>
      <td>自注意力机制矩阵 A 是定义在有限维希尔伯特空间上的正算子；音频信号作为连续时变平方可积函数 L^2[0,T]，两者的内积空间运算逻辑一致。</td>
    </tr>
    <tr>
      <td><code>#033</code></td>
      <td><strong><a href="https://academic.oup.com/book/26938" target="_blank" rel="noopener">Concentration Inequalities: A Nonasymptotic Theory of Independence</a></strong></td>
      <td>Stéphane Boucheron, Gábor Lugosi, Pascal Massart (Oxford)</td>
      <td>马尔可夫、切比雪夫、霍夫丁不等式、麦克迪尔米德不等式（McDiarmid）与熵方法对独立随机变量泛函偏差的精确界定。</td>
      <td>在评估模型阶梯置换检验（Permutation Test）时，提供经验 p 值偏离理论期望的非渐近置信区间证明。</td>
    </tr>
    <tr>
      <td><code>#034</code></td>
      <td><strong><a href="https://www.cambridge.org/core/books/sparse-image-and-signal-processing/DEBEA224FA264878A86BCFEEAC0A4EBE" target="_blank" rel="noopener">Sparse Image and Signal Processing: Wavelets, Curvelets, Morphological Diversity</a></strong></td>
      <td>Jean-Luc Starck, Fionn Murtagh, Jalal Fadili (Cambridge Univ Press)</td>
      <td>多尺度几何分析与稀疏过完备基表示；证明了在非平稳突变信号处理中，小波与曲波基较傅里叶基具有指数级更低的重构吉布斯效应。</td>
      <td>针对音频渐变过渡点出现的瞬态冲击（Percussive Transients / Drums），提供基于稀疏基分离过渡特征的最佳数学方法。</td>
    </tr>
    <tr>
      <td><code>#035</code></td>
      <td><strong><a href="https://ccrma.stanford.edu/~jos/sasp/" target="_blank" rel="noopener">Spectral Audio Signal Processing</a></strong></td>
      <td>Julius O. Smith III (Stanford CCRMA)</td>
      <td>音频信号处理权威著作：离散傅里叶变换、窗函数（Hann, Blackman-Harris）旁瓣衰减、重叠相加（OLA）功率互补条件分析。</td>
      <td>信号处理经典教材。严格推导连续信号正交分解与离散滤波器能量守恒准则：数学充要条件。</td>
    </tr>
    <tr>
      <td><code>#036</code></td>
      <td><strong><a href="http://cs-www.cs.yale.edu/homes/spielman/sagt/" target="_blank" rel="noopener">Spectral and Algebraic Graph Theory</a></strong></td>
      <td>Daniel A. Spielman (Yale, Nevanlinna Prize)</td>
      <td>图拉普拉斯算子（Graph Laplacian）与切格不等式（Cheeger's Inequality）：图的第二本征值（代数连通度）与图的最优割完全由谱间隙决定。</td>
      <td>大模型注意力图谱连通性分析利器。将音乐曲库构建为以音调与节拍为权重的图，用谱聚类寻找无缝混音转场的曲目连通路径。</td>
    </tr>
    <tr>
      <td><code>#037</code></td>
      <td><strong><a href="https://www.di.ens.fr/~fbach/ltfp_book.pdf" target="_blank" rel="noopener">Learning Theory from First Principles</a></strong></td>
      <td>Francis Bach (INRIA / ENS, Jean-Jacques Moreau Prize)</td>
      <td>从凸分析与经验过程第一性原理出发，系统推导核岭回归（Kernel Ridge Regression）、再生核希尔伯特空间（RKHS）的极小极大收敛率。</td>
      <td>课程模块 09 与附录 B 实验 E7（模型阶梯）岭回归基准的理论源头，明确线性模型与非线性核回归的本质性能边界。</td>
    </tr>
    <tr>
      <td><code>#038</code></td>
      <td><strong><a href="https://www.jmlr.org/papers/v13/gretton12a.html" target="_blank" rel="noopener">A Kernel Two-Sample Test</a></strong></td>
      <td>Arthur Gretton et al. (UCL Gatsby / Max Planck, JMLR)</td>
      <td>提出基于最大均值差异（Maximum Mean Discrepancy, MMD）的非参数双样本检验法：在特征映射嵌入 RKHS 后，利用希尔伯特范数直接衡量两分布间距。</td>
      <td>判定合成音频数据集与真实人工混音过渡数据集分布一致性的金标准判据，避免多重假设检验下的维数惩罚。</td>
    </tr>
    <tr>
      <td><code>#039</code></td>
      <td><strong><a href="https://ieeexplore.ieee.org/document/1614066" target="_blank" rel="noopener">Compressed Sensing</a></strong></td>
      <td>David L. Donoho (Stanford, Shaw Prize / Gauss Prize)</td>
      <td>奠定了压缩感知理论基石：当信号在某正交基下稀疏时，可以远低于奈奎斯特采样率的随机测量矩阵，通过 L1 范数最小化以极大概率精确重构原信号。</td>
      <td>压缩感知奠基之作。利用限制等距性质（RIP）以远低于奈奎斯特极限的采样率无损重构稀疏信号。</td>
    </tr>
    <tr>
      <td><code>#040</code></td>
      <td><strong><a href="https://ieeexplore.ieee.org/document/4016283" target="_blank" rel="noopener">Near-Optimal Signal Recovery From Random Projections: Universal Encoding Strategies?</a></strong></td>
      <td>Emmanuel Candès & Terence Tao (Caltech / UCLA, IEEE Trans IT)</td>
      <td>证明了限制等距性质（Restricted Isometry Property, RIP），给出了非相干字典下利用凸规划实现鲁棒信号恢复的最优误差常数界。</td>
      <td>剑桥数学面试中展现极高纯数-应数跨学科深度的杀手级成果。与大模型随机投影与极小秩逼近形成严密的数学闭环。</td>
    </tr>
  </tbody>
</table>

<h4>1.2 支柱二 · 架构解构（注意力、状态空间、MoE、位置编码与推理架构 40 篇）</h4>
<p>
  从原始 Transformer 的点积自注意力，到以 Mamba 为代表的状态空间模型（SSM）、以 DeepSeek 为代表的潜在注意力（MLA）与 MoE，解构模型架构的演进脉络，就是在寻找计算复杂度与归纳偏差的最优帕累托前沿。
</p>
<table class="tbl small">
  <thead><tr><th>序号</th><th>文献 / 课程 / 报告</th><th>机构 / 作者</th><th>核心数学与工程结论</th><th>核心数学与研读启示</th></tr></thead>
  <tbody>
    <tr>
      <td><code>#041</code></td>
      <td><strong><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">Attention Is All You Need</a></strong></td>
      <td>Ashish Vaswani et al. (Google Brain / Research)</td>
      <td>彻底终结循环网络范式，提出纯多头自注意力机制（Multi-Head Attention）与标准编码器-解码器架构，确立了 O(T^2 d) 相似度寻址与位置前馈连接范式。</td>
      <td>深度学习当代基石。彻底抛弃循环与卷积，以点积自注意力机制为骨架开创序列建模新纪元。</td>
    </tr>
    <tr>
      <td><code>#042</code></td>
      <td><strong><a href="https://arxiv.org/abs/1409.0473" target="_blank" rel="noopener">Neural Machine Translation by Jointly Learning to Align and Translate</a></strong></td>
      <td>Dzmitry Bahdanau, Kyunghyun Cho, Yoshua Bengio (Montreal)</td>
      <td>提出加性注意力（Additive Attention），首次允许模型在生成输出时动态对齐输入序列不同时间步，打破了固定长度上下文向量的信息瓶颈。</td>
      <td>点积注意力之前的经典对齐原语。对于双音轨连续特征对齐，加性注意力在权重平滑度上往往表现出比点积更平滑的单峰几何特性。</td>
    </tr>
    <tr>
      <td><code>#043</code></td>
      <td><strong><a href="https://arxiv.org/abs/1508.04025" target="_blank" rel="noopener">Effective Approaches to Attention-based Neural Machine Translation</a></strong></td>
      <td>Minh-Thang Luong, Hieu Pham, Christopher D. Manning (Stanford, EMNLP)</td>
      <td>系统对比了点积（Dot）、通用（General）与连结（Concat）注意力得分函数，并提出了局部注意力（Local Attention）窗口机制。</td>
      <td>局部注意力窗口是现代 Sliding Window / 流式音频模型的前身。直接指导跨歌曲音频淡入淡出中只需聚焦在转场前后固定秒数区域。</td>
    </tr>
    <tr>
      <td><code>#044</code></td>
      <td><strong><a href="https://arxiv.org/abs/1803.02155" target="_blank" rel="noopener">Self-Attention with Relative Position Representations</a></strong></td>
      <td>Peter Shaw, Jakob Uszkoreit, Ashish Vaswani (Google Brain)</td>
      <td>将绝对坐标位置编码改为相对坐标：在自注意力点积与值向量投影中分别注入相对位移偏移量 a_{i-j}^K 与 a_{i-j}^V，显著改善序列长度外推稳定性。</td>
      <td>为 RoPE 和 ALiBi 的相对位置哲学铺平道路。音频过渡只在乎距离转场割点（Split Point）的相对时间差 Delta t，而与整首歌曲绝对播放秒数无关。</td>
    </tr>
    <tr>
      <td><code>#045</code></td>
      <td><strong><a href="https://arxiv.org/abs/1901.02860" target="_blank" rel="noopener">Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context</a></strong></td>
      <td>Zihang Dai, Zhilin Yang et al. (CMU / Google Brain)</td>
      <td>提出分块循环机制（Segment-level Recurrence）与相对位置编码，打破固定输入长度壁垒，使模型能够利用跨分块的历史 KV 缓存且不产生重复前向计算。</td>
      <td>长音频流式生成的核心思想：通过维持一个循环状态缓存历史音段，使得混音播放器在播放当前段落时平滑接纳未来段落。</td>
    </tr>
    <tr>
      <td><code>#046</code></td>
      <td><strong><a href="https://arxiv.org/abs/2006.16236" target="_blank" rel="noopener">Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention</a></strong></td>
      <td>Angelos Katharopoulos et al. (Idiap, ICML)</td>
      <td>将 Softmax 核函数替换为核特征映射 phi(x)，利用矩阵乘法结合律 (phi(Q) phi(K)^T) V = phi(Q) (phi(K)^T V)，将时间复杂度降至 O(T d^2)，自回归推理演化为常数空间 RNN。</td>
      <td>利用核技巧将注意力复杂度从 O(T^2) 降至 O(T) 的典范之作。利用矩阵结合律将内积顺序颠倒实现线性流式处理。</td>
    </tr>
    <tr>
      <td><code>#047</code></td>
      <td><strong><a href="https://arxiv.org/abs/2312.00752" target="_blank" rel="noopener">Mamba: Linear-Time Sequence Modeling with Selective State Spaces</a></strong></td>
      <td>Albert Gu & Tri Dao (CMU / Princeton)</td>
      <td>打破传统连续时间不变系统（LTI）限制，提出选择性状态空间模型（Selective SSM），让参数随着输入动态变化，并设计了适配 GPU SRAM 的硬件感知并行前缀扫描算子。</td>
      <td>当前对抗 Transformer 垄断的最强非注意力架构。连续状态空间方程 h'(t) = A h(t) + B x(t) 与模拟电路音频滤波器的时域响应方程完全同构！</td>
    </tr>
    <tr>
      <td><code>#048</code></td>
      <td><strong><a href="https://arxiv.org/abs/2405.21060" target="_blank" rel="noopener">Transformers are SSMs: Generalized Models and Efficient Algorithms Through Structured State Space Duality</a></strong></td>
      <td>Tri Dao & Albert Gu (Princeton / CMU, Mamba-2)</td>
      <td>建立结构化状态空间对偶性（SSD）：严格证明了半可分离矩阵乘法与特定因果注意力的数学等价性，利用 Tensor Core 实现了比 Mamba-1 快 2-8 倍的块对角计算。</td>
      <td>高度展现数学统一之美。证明了递归更新与注意力乘法只是同一半正定 Gram 矩阵在不同基底下的投影计算。</td>
    </tr>
    <tr>
      <td><code>#049</code></td>
      <td><strong><a href="https://arxiv.org/abs/2305.13048" target="_blank" rel="noopener">RWKV: Reinventing RNNs for the Transformer Era</a></strong></td>
      <td>Bo Peng et al. (RWKV Foundation, EMNLP)</td>
      <td>融合 Transformer 的并行可训练性与 RNN 的 O(1) 推理优势，通过通道混合与时间混合算子将历史状态递归压缩为定长向量。</td>
      <td>轻量化端侧大模型典范。验证 1B 到 3B 规模小模型在严苛硬件显存约束下的架构调优与知识密度上限。</td>
    </tr>
    <tr>
      <td><code>#050</code></td>
      <td><strong><a href="https://arxiv.org/abs/2307.08621" target="_blank" rel="noopener">Retentive Network: A Successor to Transformer for Large Language Models</a></strong></td>
      <td>Yutao Sun et al. (Microsoft Research)</td>
      <td>提出保留网络（RetNet），支持三种并行表示：并行训练、循环推理与分块循环长文本处理，引入复数衰减指数作为显式衰减记忆。</td>
      <td>复指数衰减因子 e^{-gamma (i-j)} 与声学混响时间（RT60）在物理上具有相同的衰减衰落特性，是建模音乐残响衰减的理想数学骨架。</td>
    </tr>
    <tr>
      <td><code>#051</code></td>
      <td><strong><a href="https://arxiv.org/abs/1701.06538" target="_blank" rel="noopener">Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer</a></strong></td>
      <td>Noam Shazeer et al. (Google Brain, ICLR)</td>
      <td>提出稀疏门控混合专家（MoE）层：利用可微门控网络在每个 token 上只动态路由激活极少部分专家（Top-K），实现参数量扩大数十倍而计算量保持恒定。</td>
      <td>解决模型容量与计算成本冲突的基石。在跨音乐风格建模中，可将电子乐、古典乐、爵士乐转场分别交由不同专用专家网络处理。</td>
    </tr>
    <tr>
      <td><code>#052</code></td>
      <td><strong><a href="https://arxiv.org/abs/2101.03961" target="_blank" rel="noopener">Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity</a></strong></td>
      <td>William Fedus, Barret Zoph, Noam Shazeer (Google Brain, JMLR)</td>
      <td>将路由极端简化为 Top-1 单专家分配，提出配套的专家容量因子（Capacity Factor）与辅助负载均衡损失，训练出首个万亿参数规模稀疏模型。</td>
      <td>理解分布式通信中 All-to-All 的开销瓶颈。在设计小规模设备端音频模型时，Top-1 路由能彻底杜绝多专家拼接带来的内存碎片。</td>
    </tr>
    <tr>
      <td><code>#053</code></td>
      <td><strong><a href="https://arxiv.org/abs/2006.16668" target="_blank" rel="noopener">GShard: Scaling Giant Models with Conditional Computation and Automatic Sharding</a></strong></td>
      <td>Dmitry Lepikhin et al. (Google Research, ICLR)</td>
      <td>结合编译器 SPMD 自动切分注解与 Top-2 门控路由，规范了专家并行（Expert Parallelism）在多 TPU/GPU 集群上的通信对齐机制。</td>
      <td>JAX 生态中 Mesh / PartitionSpec 自动处理复杂并行切分的理论祖师，课程模块 06 与附录 B 实验 E6 的系统级底座。</td>
    </tr>
    <tr>
      <td><code>#054</code></td>
      <td><strong><a href="https://arxiv.org/abs/2401.04088" target="_blank" rel="noopener">Mixtral of Experts</a></strong></td>
      <td>Albert Q. Jiang et al. (Mistral AI)</td>
      <td>开源 MoE 标杆架构：8x7B 架构中每个 token 动态激活 2 个专家（实际消耗 13B 激活算力却达到 70B 稠密模型的知识容量），全面采用 SwiGLU 与 GQA。</td>
      <td>工程落地黄金配比。证明了稀疏条件计算无需过度复杂的门控机制，只要基础 FFN 表征足够强，Top-2 线性加权即可达成优异泛化。</td>
    </tr>
    <tr>
      <td><code>#055</code></td>
      <td><strong><a href="https://arxiv.org/abs/2405.04434" target="_blank" rel="noopener">DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model</a></strong></td>
      <td>DeepSeek-AI (DeepSeek Technical Report)</td>
      <td>提出多头潜在注意力（MLA）：将 KV 向量低秩投影为潜在向量以压缩 KV Cache 93.3%；首创 DeepSeekMoE 细粒度专家分割与共享专家架构。</td>
      <td>矩阵低秩分解与体系结构协同设计的现代巅峰作品！MLA 的低秩压缩矩阵乘法可直接用于压缩多音轨历史状态缓冲区。</td>
    </tr>
    <tr>
      <td><code>#056</code></td>
      <td><strong><a href="https://arxiv.org/abs/2412.19437" target="_blank" rel="noopener">DeepSeek-V3 Technical Report</a></strong></td>
      <td>DeepSeek-AI</td>
      <td>无辅助损失负载均衡（Auxiliary-loss-free Load Balancing）：通过自适应偏置替代惩罚损失，消除对主任务梯度的干扰；全面采用 FP8 混合精度与多 Token 预测（MTP）。</td>
      <td>深入领悟优化目标函数与工程硬约束（GPU 负载均衡）解耦的数学思维，杜绝在次要工程指标上牺牲主要建模精度的陷阱。</td>
    </tr>
    <tr>
      <td><code>#057</code></td>
      <td><strong><a href="https://arxiv.org/abs/2104.09864" target="_blank" rel="noopener">RoFormer: Enhanced Transformer with Rotary Position Embedding</a></strong></td>
      <td>Jianlin Su et al. (RoFormer Authors)</td>
      <td>提出旋转位置编码（RoPE）：利用复数内积与二维正交旋转矩阵将相对位置信息直接编码至 Q 与 K 的内积中，满足点积只依赖相对位移 n-m。</td>
      <td>剑桥几何与复数代数分析经典典范！公式 <R_m q, R_n k> = <q, R_{n-m} k> 必须能一气呵成手推出来；与音频复数 STFT 谱的相位调制同质同源。</td>
    </tr>
    <tr>
      <td><code>#058</code></td>
      <td><strong><a href="https://arxiv.org/abs/2108.12409" target="_blank" rel="noopener">Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation</a></strong></td>
      <td>Ofir Press, Noah A. Smith, Mike Lewis (UW / Meta AI, ICLR)</td>
      <td>提出 ALiBi：摒弃所有显式位置嵌入，在注意力分数上直接加上与 token 距离成正比的静态负偏置 -m*(i-j)，实现无需微调即可外推到未见过的更长上下文。</td>
      <td>极简数学设计的优雅胜利。负线性偏置相当于对历史信息赋予拉普拉斯先验衰减，保证音频混音模型对外推长曲目的时间衰减单调稳定。</td>
    </tr>
    <tr>
      <td><code>#059</code></td>
      <td><strong><a href="https://arxiv.org/abs/2309.00071" target="_blank" rel="noopener">YaRN: Efficient Context Window Extension of Large Language Models</a></strong></td>
      <td>Shouyuan Chen et al. (Nous Research, ICLR)</td>
      <td>提出 YaRN：将位置插值细分为高频维持（局部敏锐）、低频线性插值与中频非均匀调制，并引入注意力熵温度补偿因子，实现 2x-16x 上下文无损扩展。</td>
      <td>现代状态空间模型（SSM）的理论基础。用正交多项式基底压缩连续时间信号记忆，实现长程高效上下文追踪。</td>
    </tr>
    <tr>
      <td><code>#060</code></td>
      <td><strong><a href="https://arxiv.org/abs/2306.15595" target="_blank" rel="noopener">Extending Context Window of Large Language Models via Positional Interpolation</a></strong></td>
      <td>Shoubhik Debnath et al. (Meta AI)</td>
      <td>证明将位置索引线性缩放 S 倍比直接外推具有更紧凑的插值误差界，将最大位置编码范围直接拉伸到训练阶段覆盖的凸包内部。</td>
      <td>凸分析基本结论：数值插值在有界紧集内误差有界，而数值外推误差随距离指数发散。做模型泛化设计时应尽可能将问题构造成插值问题。</td>
    </tr>
    <tr>
      <td><code>#061</code></td>
      <td><strong><a href="https://arxiv.org/abs/1607.06450" target="_blank" rel="noopener">Layer Normalization</a></strong></td>
      <td>Jimmy Lei Ba, Jamie Ryan Kiros, Geoffrey E. Hinton (Toronto)</td>
      <td>提出层归一化（LayerNorm）：对单个样本的所有特征分量沿隐藏维度计算均值与方差进行规范化，彻底解除了批归一化对 Batch 维度的强依赖。</td>
      <td>使 Transformer 支持动态变长序列与流式单样本推理的根本支柱。在音频特征流水线中对响度动态范围做实时的 Z-score 规范化。</td>
    </tr>
    <tr>
      <td><code>#062</code></td>
      <td><strong><a href="https://arxiv.org/abs/1910.07467" target="_blank" rel="noopener">Root Mean Square Layer Normalization</a></strong></td>
      <td>Biao Zhang & Rico Sennrich (Edinburgh, NeurIPS)</td>
      <td>提出 RMSNorm：证明 LayerNorm 的均值中心化并不带来显著正则化增益，仅通过均方根归一化维持缩放不变性，节省 7%-50% 归一化计算开销。</td>
      <td>现代大模型（LLaMA、Mistral、DeepSeek）标配。在物理音频能量中，均方根（RMS）直接对应真实声学功率，两者在度量上完全统一！</td>
    </tr>
    <tr>
      <td><code>#063</code></td>
      <td><strong><a href="https://arxiv.org/abs/1512.03385" target="_blank" rel="noopener">Deep Residual Learning for Image Recognition</a></strong></td>
      <td>Kaiming He et al. (Microsoft Research, CVPR Best Paper)</td>
      <td>提出恒等映射残差连接（Residual Connection）y = x + F(x)，从反向传播数学推导上证明了梯度流可以直接穿透深层网络，攻克梯度消失困境。</td>
      <td>深度学习历史性突破。证明恒等映射（Identity Mapping）解决了深层梯度退化难题，使千层网络稳定反向传播。</td>
    </tr>
    <tr>
      <td><code>#064</code></td>
      <td><strong><a href="https://arxiv.org/abs/2203.00555" target="_blank" rel="noopener">DeepNet: Scaling Transformers to 1,000 Layers</a></strong></td>
      <td>Hongyu Wang et al. (Microsoft Research)</td>
      <td>分析了 Pre-LN 与 Post-LN 在深度扩展时的方差积累机理，推导出 DeepNorm 初始化方案，首次将 Transformer 深度无损失震荡地推至 1000 层。</td>
      <td>严密的矩阵方差传播推导过程。指导任何深度特征网络在没有归一化层辅助时，如何通过缩放常数 alpha 稳定前向激活幅度。</td>
    </tr>
    <tr>
      <td><code>#065</code></td>
      <td><strong><a href="https://arxiv.org/abs/2002.05202" target="_blank" rel="noopener">GLU Variants Improve Transformer</a></strong></td>
      <td>Noam Shazeer (Google Brain)</td>
      <td>系统对比了门控线性单元（GLU）在前馈网络中的应用，证明基于 Swish 激活的 SwiGLU(x) = (xW * swish(xV)) W2 在收敛速度与最终困惑度上全面超越经典 ReLU/GELU。</td>
      <td>逐行剖析隐藏层维度 intermediate_size = floor(2/3 * 4d) 的由来。双线性通道相乘为模型注入了低阶交叉项交互能力。</td>
    </tr>
    <tr>
      <td><code>#066</code></td>
      <td><strong><a href="https://arxiv.org/abs/2201.11903" target="_blank" rel="noopener">Chain-of-Thought Prompting Elicits Reasoning in Large Language Models</a></strong></td>
      <td>Jason Wei et al. (Google Research, NeurIPS)</td>
      <td>证明自回归模型在输出最终答案前生成中间思考步骤，能将复杂的图搜索问题解构为局部的马尔可夫决策序列，诱导出强大的多步推理能力。</td>
      <td>计算复杂性理论解释：每个 token 前向只执行固定深度的电路计算，显式思维链（CoT）实际上是用时间换空间，扩展了图灵完备循环步数。</td>
    </tr>
    <tr>
      <td><code>#067</code></td>
      <td><strong><a href="https://arxiv.org/abs/2203.11171" target="_blank" rel="noopener">Self-Consistency Improves Chain of Thought Reasoning in Language Models</a></strong></td>
      <td>Xuezhi Wang et al. (Google Research, ICLR)</td>
      <td>提出自洽性采样（Self-Consistency）：在多路径思考轨迹中取边际概率最大或多数投票的结果，利用蒙特卡洛采样显著提升复杂推理任务准确率。</td>
      <td>课程模块 18 核心代码的数学源头。在音频决策不确定时，多次采样转场参数并进行核密度估计（KDE），选取模式峰值作为最稳健选择。</td>
    </tr>
    <tr>
      <td><code>#068</code></td>
      <td><strong><a href="https://arxiv.org/abs/2305.10601" target="_blank" rel="noopener">Tree of Thoughts: Deliberate Problem Solving with Large Language Models</a></strong></td>
      <td>Shunyu Yao et al. (Princeton / Google DeepMind, NeurIPS)</td>
      <td>将线性链式思考拓展为树状状态空间搜索，结合启发式评估、广度优先（BFS）与深度优先回溯（DFS），实现跨步骤前瞻与自我修正。</td>
      <td>经典图搜索与符号 AI 的现代复兴。在 DJ 连续混音的长远规划中，通过前瞻数首歌曲的调式与节拍演进图，搜索全局能量波动最小的转场序列。</td>
    </tr>
    <tr>
      <td><code>#069</code></td>
      <td><strong><a href="https://arxiv.org/abs/2305.20050" target="_blank" rel="noopener">Let's Verify Step by Step</a></strong></td>
      <td>Hunter Lightman et al. (OpenAI)</td>
      <td>系统对比了结果监督（ORM）与过程监督（PRM），证明对每一步逻辑推导进行单步显式验证打分，能以极高效率抑制幻觉并支撑搜索扩展。</td>
      <td>剑桥数学证明批改的直观映射：看证明不能只看最后一行 Q.E.D.，中间一步逻辑漏洞全题判错。在音频合成管线中同样必须对每个时间切片做连续性单步校验。</td>
    </tr>
    <tr>
      <td><code>#070</code></td>
      <td><strong><a href="https://openai.com/index/learning-to-reason-with-llms/" target="_blank" rel="noopener">Learning to Reason with LLMs (OpenAI o1 System Card)</a></strong></td>
      <td>OpenAI Reasoning Research Team</td>
      <td>揭示了推理阶段算力（Test-Time Compute）的新标度律：通过强化学习让模型自主学会反思、回溯试错与验证，在数学竞赛与高级编程中达到人类博士水准。</td>
      <td>开启推理大模型时代的关键文献。证明思维链长度可以随问题难度自适应扩展，为后训练算法提供了以强化学习为核心的全新迭代方向。</td>
    </tr>
    <tr>
      <td><code>#071</code></td>
      <td><strong><a href="https://arxiv.org/abs/2501.12948" target="_blank" rel="noopener">DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning</a></strong></td>
      <td>DeepSeek-AI</td>
      <td>证明在零基础冷启动下，仅凭纯规则可验证奖励函数（Rule-Based Accuracy & Format Reward）运行大规模 GRPO 强化学习，即可自然涌现出深度思考与自发回溯。</td>
      <td>彻底破除对昂贵人类偏好标注的迷信。只要存在客观可计算判据（如音频能量守恒公式、无破音硬约束），强化学习即可全自动驱动策略进化。</td>
    </tr>
    <tr>
      <td><code>#072</code></td>
      <td><strong><a href="https://arxiv.org/abs/2103.00020" target="_blank" rel="noopener">Learning Transferable Visual Representations From Natural Language Supervision</a></strong></td>
      <td>Alec Radford et al. (OpenAI, CLIP)</td>
      <td>提出双塔对比学习（InfoNCE Loss）：通过将文本与图像投影到统一的归一化超球面上拉近正样本内积、推开负样本，实现超强的零样本泛化能力。</td>
      <td>多模态对比学习典范。用双塔网络与对称交叉熵在海量数据上对齐文本与向量空间。</td>
    </tr>
    <tr>
      <td><code>#073</code></td>
      <td><strong><a href="https://arxiv.org/abs/2212.04356" target="_blank" rel="noopener">Robust Speech Recognition via Large-Scale Weak Supervision</a></strong></td>
      <td>Alec Radford et al. (OpenAI, Whisper)</td>
      <td>证明在 68 万小时带噪弱监督音频数据上训练标准编码器-解码器 Transformer，无需复杂的 CTC 或专门声学模型，即可展现出无与伦比的跨语言与抗噪鲁棒性。</td>
      <td>大规模端到端语音转录标杆。其特征工程与编解码器因果自回归架构是现代序列识别标准范式。</td>
    </tr>
    <tr>
      <td><code>#074</code></td>
      <td><strong><a href="https://arxiv.org/abs/2210.13438" target="_blank" rel="noopener">High Fidelity Neural Audio Compression</a></strong></td>
      <td>Alexandre Défossez et al. (Meta FAIR, EnCodec)</td>
      <td>提出 EnCodec：结合卷积自动编码器、残差矢量量化（Residual Vector Quantization, RVQ）与多尺度 STFT 鉴别器，以极低码率将连续音频解耦为离散 Token。</td>
      <td>残差矢量量化（RVQ）经典。用多阶段分层码本将高维连续信号量化为紧凑离散 Token。</td>
    </tr>
    <tr>
      <td><code>#075</code></td>
      <td><strong><a href="https://arxiv.org/abs/2306.05284" target="_blank" rel="noopener">Simple and Controllable Music Generation</a></strong></td>
      <td>Jade Copet et al. (Meta FAIR, MusicGen)</td>
      <td>提出延迟模式建模（Delay Pattern Modeling）：通过对多个 RVQ 码本的时间错位重排，允许自回归语言模型同时单步生成多个码流，避免层次化树形生成的指数延迟。</td>
      <td>多码流时域交叠建模的精妙数学排布。与两首歌曲交叉淡入淡出时双轨交叠区域的时域多流混合机制完全同构。</td>
    </tr>
    <tr>
      <td><code>#076</code></td>
      <td><strong><a href="https://arxiv.org/abs/2306.15687" target="_blank" rel="noopener">Voicebox: Text-Guided Multilingual Universal Speech Generation at Scale</a></strong></td>
      <td>Matthew Le et al. (Meta FAIR)</td>
      <td>将连续流匹配（Flow Matching）成功扩展到大规模音频生成领域，利用最优传输速度场实现了超越传统自回归架构的保真度与平滑编辑能力。</td>
      <td>针对连续波形插值的最优生成范式。证明了在连续空间内求解常微分方程比在离散 Token 空间自回归解码更加平滑且不存在累积量化噪声。</td>
    </tr>
    <tr>
      <td><code>#077</code></td>
      <td><strong><a href="https://arxiv.org/abs/2302.13971" target="_blank" rel="noopener">LLaMA: Open and Efficient Foundation Language Models</a></strong></td>
      <td>Hugo Touvron et al. (Meta FAIR)</td>
      <td>开源大模型运动的里程碑。确立了现代 LLM 的标准工业构型：Pre-normalization (RMSNorm)、SwiGLU 激活函数与 RoPE 旋转位置编码，证明小模型充分训练超越大模型。</td>
      <td>代码实验核心基座。深入理解其配置超参数（hidden_size, intermediate_size, num_heads）的协同缩放法则。</td>
    </tr>
    <tr>
      <td><code>#078</code></td>
      <td><strong><a href="https://arxiv.org/abs/2307.09288" target="_blank" rel="noopener">Llama 2: Open Foundation and Fine-Tuned Chat Models</a></strong></td>
      <td>Hugo Touvron et al. (Meta FAIR)</td>
      <td>全面升级 70B 模型至分组查询注意力（GQA），详尽公开了预训练混合精度、双奖励模型 RLHF、拒绝采样与安全红蓝对抗对齐的全流程工业实践细节。</td>
      <td>课程模块 07 对齐与微调的核心参考标准，展现了如何从单次前向输出走向可靠安全的工业级系统。</td>
    </tr>
    <tr>
      <td><code>#079</code></td>
      <td><strong><a href="https://arxiv.org/abs/2407.21783" target="_blank" rel="noopener">The Llama 3 Herd of Models</a></strong></td>
      <td>Meta AI Research Team</td>
      <td>公开了 405B 超大规模稠密模型的全套工程全景：15T Tokens 预训练数据配比、长上下文外推（RoPE base 500k）、128k tiktoken 词表与全栈软硬件容错通信协议。</td>
      <td>现代大模型训练的终极工程白皮书。附录关于高质量合成数据清洗与模型梯队蒸馏的细节，是高质量数据构建的最佳指引。</td>
    </tr>
    <tr>
      <td><code>#080</code></td>
      <td><strong><a href="https://arxiv.org/abs/2010.11929" target="_blank" rel="noopener">An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale</a></strong></td>
      <td>Alexey Dosovitskiy et al. (Google Research Brain, ICLR)</td>
      <td>提出视觉 Transformer（ViT）：将 2D 图像平铺切分为 16x16 线性嵌入 patch 序列作为标准输入，证明了在海量数据预训练下纯 Transformer 全面超越卷积归纳偏差。</td>
      <td>纯 Transformer 架构征服计算机视觉与 2D 信号的里程碑。证明分块线性切片加上位置编码即可替代卷积。</td>
    </tr>
  </tbody>
</table>

<h4>1.3 支柱三 · 训练动力学（标度律、优化器几何、混合精度与对齐 RL 40 篇）</h4>
<p>
  训练大模型并非碰运气，而是在高维非凸流形上求解随机动力系统。从计算最优标度律（Chinchilla）、最大更新参数化（muP），到混合精度数值理论与直接偏好优化（DPO/GRPO），这一支柱揭示了智能演化的物理规律。
</p>
<table class="tbl small">
  <thead><tr><th>序号</th><th>文献 / 课程 / 报告</th><th>机构 / 作者</th><th>核心数学与工程结论</th><th>核心数学与研读启示</th></tr></thead>
  <tbody>
    <tr>
      <td><code>#081</code></td>
      <td><strong><a href="https://arxiv.org/abs/2001.08361" target="_blank" rel="noopener">Scaling Laws for Neural Language Models</a></strong></td>
      <td>Jared Kaplan et al. (OpenAI / Johns Hopkins)</td>
      <td>首次发现跨越 6 个数量级的幂律缩放定律：交叉熵损失与模型参数量 N、数据集规模 D 及计算量 C 呈高精度的幂律关系 L ~ N^{-alpha_N}，指导超大规模预算分配。</td>
      <td>剑桥数学经典的渐进分析（Asymptotic Analysis）实践。在规划音频模型算力实验时，先小规模扫描参数确定幂指数，杜绝盲目浪费算力。</td>
    </tr>
    <tr>
      <td><code>#082</code></td>
      <td><strong><a href="https://arxiv.org/abs/2203.15556" target="_blank" rel="noopener">Training Compute-Optimal Large Language Models</a></strong></td>
      <td>Jordan Hoffmann et al. (DeepMind, Chinchilla)</td>
      <td>修正了 Kaplan 定律的实验偏差，严格证明在固定计算预算下，模型参数量 N 与训练 Token 数量 D 应以相同比例（1:1）等比缩放，确立了 Chinchilla 计算最优前沿。</td>
      <td>模型设计的铁律！课程模块 05 手算参数与 Token 比例的核心理论来源，明确告诉我们在数据量有限时绝不应盲目堆砌参数。</td>
    </tr>
    <tr>
      <td><code>#083</code></td>
      <td><strong><a href="https://arxiv.org/abs/2010.14701" target="_blank" rel="noopener">Scaling Laws for Autoregressive Generative Modeling</a></strong></td>
      <td>Tom Henighan et al. (Anthropic)</td>
      <td>将自回归缩放定律推广至多模态（图像、音频、文本与视频），证明幂律缩放是自回归模型在各类无序信息熵压缩过程中的普适数学规律。</td>
      <td>为音频离散序列的生成模型提供理论定心丸：无论输入是自然文本还是音乐波形 Token，只要遵循自回归压缩，损失函数就受幂律定律严格支配。</td>
    </tr>
    <tr>
      <td><code>#084</code></td>
      <td><strong><a href="https://arxiv.org/abs/2210.14891" target="_blank" rel="noopener">Broken Neural Scaling Laws</a></strong></td>
      <td>Ethan Caballero et al. (MILA, ICLR)</td>
      <td>通过引入广义 S 型曲线（Smoothly-broken Power Laws），准确解释了模型在特定任务上出现的突变相变、饱和平台期与多阶段缩放行为。</td>
      <td>展现真实世界非理想幂律的动力学相变过程。当跨淡入淡出模型达到能量守恒临界点时，指标往往出现非线性的骤升台阶。</td>
    </tr>
    <tr>
      <td><code>#085</code></td>
      <td><strong><a href="https://arxiv.org/abs/2303.08774" target="_blank" rel="noopener">GPT-4 Technical Report</a></strong></td>
      <td>OpenAI</td>
      <td>展示了惊人的可预测缩放（Predictable Scaling）：用千分之一乃至万分之一的小算力模型，直接在对数坐标系上精确预测出完整 GPT-4 的最终损失与编程通过率。</td>
      <td>大科学（Big Science）工程的确定性典范。严谨科研绝非碰运气调参，而是在小尺度上通过严密外推预测大系统的行为。</td>
    </tr>
    <tr>
      <td><code>#086</code></td>
      <td><strong><a href="https://arxiv.org/abs/1412.6980" target="_blank" rel="noopener">Adam: A Method for Stochastic Optimization</a></strong></td>
      <td>Diederik P. Kingma & Jimmy Ba (Amsterdam / Toronto, ICLR)</td>
      <td>提出 Adam 优化器：结合一阶动量（期望方向）与二阶未中心化动量（坐标自适应尺度调节），通过除以 sqrt(v_t)+epsilon 实现对坐标轴各向异性曲率的自适应修正。</td>
      <td>必须深入理解一阶矩与二阶矩的偏差纠正公式（Bias Correction）1/(1-beta^t)。在训练初始阶段防止由于零初始化导致的步长失控。</td>
    </tr>
    <tr>
      <td><code>#087</code></td>
      <td><strong><a href="https://arxiv.org/abs/1711.05101" target="_blank" rel="noopener">Decoupled Weight Decay Regularization</a></strong></td>
      <td>Ilya Loshchilov & Frank Hutter (Freiburg, ICLR, AdamW)</td>
      <td>指出了经典 L2 正则化在自适应梯度算法中与真实权重衰减的数学不等价性，提出将权重衰减显式解耦至梯度更新之外，奠定了所有 Transformer 训练的标准优化器。</td>
      <td>剑桥数学面试极佳的深度洞察题：为什么梯度归一化后直接加权重衰减会导致大梯度分量衰减不足？AdamW 的闭式解剖析。</td>
    </tr>
    <tr>
      <td><code>#088</code></td>
      <td><strong><a href="https://arxiv.org/abs/2203.03466" target="_blank" rel="noopener">Tensor Programs V: Tuning Large Neural Networks via Maximal Update Parametrization</a></strong></td>
      <td>Greg Yang et al. (Microsoft Research)</td>
      <td>提出最大更新参数化（muP）：在无穷宽极限下保持各层激活变化与权重梯度更新尺度为 Theta(1)，实现小模型上搜索的最优超参数（学习率等）零代价直接迁移至超大模型。</td>
      <td>高深纯数无穷维极限与算子代数在大模型中的应用标杆！攻克大模型重复扫超参带来的巨大资源浪费。</td>
    </tr>
    <tr>
      <td><code>#089</code></td>
      <td><strong><a href="https://arxiv.org/abs/2010.01412" target="_blank" rel="noopener">Sharpness-Aware Minimization for Efficiently Improving Generalization</a></strong></td>
      <td>Pierre Foret et al. (Google Research, ICLR, SAM)</td>
      <td>提出锐度感知最小化（SAM）：不仅寻找训练损失小的极小值，更通过极小极大博弈 min_w max_{||epsilon||<=rho} L(w+epsilon) 寻找平坦极小值，显著压低海森矩阵谱范数以提升泛化。</td>
      <td>微分几何曲率控制的典型应用。在音频微调数据极少时，SAM 能有效阻止模型陷入局部尖锐谷底，避免对特定过渡特征过拟合。</td>
    </tr>
    <tr>
      <td><code>#090</code></td>
      <td><strong><a href="https://arxiv.org/abs/2110.02861" target="_blank" rel="noopener">8-bit Optimizers via Block-wise Quantization</a></strong></td>
      <td>Tim Dettmers et al. (Washington, ICLR)</td>
      <td>提出分块 8-bit AdamW 与页面优化器内存交换：将占显存最大头的一阶和二阶矩状态非均匀量化为 8-bit，显存占用暴降 75% 且优化轨迹完全保持一致。</td>
      <td>单卡微调能够跑起来的关键支柱。理解非线性浮点分布分位数划分的数学依据，用在 Colab 免费 T4 上完成原本需要 A100 的任务。</td>
    </tr>
    <tr>
      <td><code>#091</code></td>
      <td><strong><a href="https://arxiv.org/abs/2204.02311" target="_blank" rel="noopener">PaLM: Scaling Language Modeling with Pathways</a></strong></td>
      <td>Aakanksha Chowdhery et al. (Google Research, JMLR)</td>
      <td>详尽披露了 540B 超大规模模型训练全过程，首次深度解剖了损失突然尖峰（Loss Spikes）的根本诱因，提出动态回退跳过异常数据并结合 Adafactor 优化的工程战术。</td>
      <td>科学排查数值灾难的权威指南。遇到不可解释的 NaN / Inf 梯度爆炸时，第一步不是重置权重，而是检查谱半径和局部 batch 奇异值。</td>
    </tr>
    <tr>
      <td><code>#092</code></td>
      <td><strong><a href="https://arxiv.org/abs/2203.05482" target="_blank" rel="noopener">Model Soups: Averaging Weights of Multiple Fine-Tuned Models Improves Accuracy Without Increasing Inference Time</a></strong></td>
      <td>Mitchell Wortsman et al. (Washington, ICML)</td>
      <td>发现从同一预训练基座出发进行不同超参数微调的模型权重位于同一盆地内部，对这组模型的参数进行简单的凸线性组合（Uniform/Greedy Soup）能系统性战胜单一最佳模型。</td>
      <td>模型参数空间算术与合并技术经典。证明微调模型的参数权重在流形上具有向量加减与插值语义。</td>
    </tr>
    <tr>
      <td><code>#093</code></td>
      <td><strong><a href="https://arxiv.org/abs/1803.03635" target="_blank" rel="noopener">The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks</a></strong></td>
      <td>Jonathan Frankle & Michael Carbin (MIT, ICLR Best Paper)</td>
      <td>彩票假说：密集的随机初始化网络中包含子网络（中奖彩票），当单独使用初始权重重新训练时，它们能以原网络几分之一的参数量达到甚至超越原始性能。</td>
      <td>揭示了过参数化网络优化的本质并非所有权重都在发力，而是为高维随机子空间搜索提供了足够的相交概率空间。</td>
    </tr>
    <tr>
      <td><code>#094</code></td>
      <td><strong><a href="https://arxiv.org/abs/2211.10438" target="_blank" rel="noopener">SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models</a></strong></td>
      <td>Guangxuan Xiao et al. (MIT / Meta, ICML)</td>
      <td>发现激活张量存在显著的系统性异常值通道（Outlier Channels），提出通过等价可逆对角变换 W_new = diag(s) * W, X_new = X * diag(s)^{-1} 将激活的量化难度迁移到权重上，实现 W8A8 高精度量化。</td>
      <td>极其漂亮的线性代数等价基变换！证明了数值表示难题可以通过简单的矩阵相似变换彻底化解，课程模块 08 量化理论基础。</td>
    </tr>
    <tr>
      <td><code>#095</code></td>
      <td><strong><a href="https://arxiv.org/abs/1710.03740" target="_blank" rel="noopener">Mixed Precision Training</a></strong></td>
      <td>Paulius Micikevicius et al. (NVIDIA / Baidu, ICLR)</td>
      <td>奠定了现代深度学习混合精度的三大支柱：维持一份 FP32 主权重副本、动态损失缩放（Loss Scaling）防止梯度下溢、矩阵乘法在 Tensor Core 上以 FP16 计算并累加为 FP32。</td>
      <td>课程模块 05 混合精度机制的原始定义。必须清楚 IEEE 754 半精度浮点数的 10 位尾数与 5 位指数所决定的数值动态范围极限。</td>
    </tr>
    <tr>
      <td><code>#096</code></td>
      <td><strong><a href="https://ieeexplore.ieee.org/document/8944061" target="_blank" rel="noopener">Bfloat16 Processing for Neural Networks</a></strong></td>
      <td>Neil Burgess et al. (Arm / NVIDIA / Intel, IEEE)</td>
      <td>分析了 BF16（8 位指数 + 7 位尾数）的硬件架构优势：保持与 FP32 完全相同的动态范围（[-10^38, 10^38]），从而在训练中彻底免去了繁琐易错的损失缩放（Loss Scaling）。</td>
      <td>为何现代大模型微调首选 BF16 而不是 FP16 的硬件逻辑。在音频数值敏感计算中杜绝梯度下溢归零。</td>
    </tr>
    <tr>
      <td><code>#097</code></td>
      <td><strong><a href="https://arxiv.org/abs/2209.05433" target="_blank" rel="noopener">FP8 Formats for Deep Learning</a></strong></td>
      <td>Paulius Micikevicius et al. (NVIDIA / Arm / Intel)</td>
      <td>制定了 8 位浮点标准：E4M3（前向激活与权重，高精度）与 E5M2（反向梯度，大动态范围），配合延迟缩放（Delayed Scaling）实现计算吞吐翻倍。</td>
      <td>Hopper/Blackwell 架构最前沿低精度浮点数学。指导在大模型后训练与大规模特征提取时如何压榨硬件张量核极限。</td>
    </tr>
    <tr>
      <td><code>#098</code></td>
      <td><strong><a href="https://arxiv.org/abs/2310.10537" target="_blank" rel="noopener">Microscaling Formats for Deep Learning (MXFP4 / MXFP6 / MXFP8)</a></strong></td>
      <td>Bita Darvish Rouhani et al. (Microsoft / AMD / NVIDIA / OCP)</td>
      <td>开放计算项目（OCP）微缩放格式标准：在小块（如 32 个元素）内共享单个缩放因子，允许基底元素压缩至 4-bit / 6-bit 浮点而几乎无精度损耗。</td>
      <td>未来端侧超轻量级神经网络推理的终极标准，指导嵌入式声学处理器设计。</td>
    </tr>
    <tr>
      <td><code>#099</code></td>
      <td><strong><a href="https://arxiv.org/abs/1706.03741" target="_blank" rel="noopener">Deep Reinforcement Learning from Human Preferences</a></strong></td>
      <td>Paul F. Christiano, Jan Leike et al. (OpenAI / DeepMind, NeurIPS)</td>
      <td>将强化学习奖励函数从离散手工规则解放为成对人类比较反馈，利用 Bradley-Terry 偏好模型估计潜在奖励函数，奠定了现代 RLHF 的底层理论框架。</td>
      <td>基于直接偏好优化的对齐革命。跳过复杂的奖励模型与强化学习 PPO，直接用交叉熵闭式解拟合人类偏好。</td>
    </tr>
    <tr>
      <td><code>#100</code></td>
      <td><strong><a href="https://arxiv.org/abs/2203.02155" target="_blank" rel="noopener">Training Language Models to Follow Instructions with Human Feedback</a></strong></td>
      <td>Long Ouyang et al. (OpenAI, InstructGPT / NeurIPS)</td>
      <td>提出完整的三阶段工业对齐流水线：有监督微调（SFT）-> 奖励模型训练（RM）-> 近端策略优化（PPO），证明较小但经过对齐的模型完胜未经对齐的超大基座。</td>
      <td>后训练经典三部曲标准教科书。理解 KL 散度约束项 beta * D_KL(pi_theta || pi_ref) 在防止策略漂移中的锚定作用。</td>
    </tr>
    <tr>
      <td><code>#101</code></td>
      <td><strong><a href="https://arxiv.org/abs/2305.18290" target="_blank" rel="noopener">Direct Preference Optimization: Your Language Model is Secretly a Reward Model</a></strong></td>
      <td>Rafael Rafailov et al. (Stanford, NeurIPS Best Paper)</td>
      <td>提出直接偏好优化（DPO）：通过对 Bradley-Terry 似然进行闭式变量替换，直接用当前策略与参考策略的对数比值表示隐式奖励，彻底抛弃了不稳定的显式奖励模型与 PPO 采样。</td>
      <td>课程模块 07 与实验 E5 的理论灵魂！闭式推导证明优雅至极，必须能够在草稿纸上从 PPO 目标一步步代数化简出 DPO 损失。</td>
    </tr>
    <tr>
      <td><code>#102</code></td>
      <td><strong><a href="https://arxiv.org/abs/2402.03300" target="_blank" rel="noopener">DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models</a></strong></td>
      <td>Zhihong Shao et al. (DeepSeek-AI, GRPO)</td>
      <td>提出群相对策略优化（GRPO）：省去了传统 PPO 中巨大的评价网络（Critic Network），改由对同一输入采样的输出群计算相对优势（Normalized Advantage），节约 50% 显存并提升稳定性。</td>
      <td>当前数学与可验证推理强化学习（如 DeepSeek-R1）的最核心驱动引擎！群均值和方差归一化直接消除了基线估计误差。</td>
    </tr>
    <tr>
      <td><code>#103</code></td>
      <td><strong><a href="https://arxiv.org/abs/2402.01306" target="_blank" rel="noopener">KTO: Model Alignment as Prospect Theoretic Optimization</a></strong></td>
      <td>Kawin Ethayarajh et al. (Stanford / Contextual AI, ICML)</td>
      <td>基于卡尼曼-特沃斯基前景理论（Kahneman-Tversky Prospect Theory）：人类对损失的厌恶程度高于对收益的喜悦，提出无需成对偏好、只需单个正/负二元标签即可完成对齐的 KTO 算法。</td>
      <td>行为经济学与应用数学跨界融合的极佳案例。在只有用户“切歌”（负样本）或“单曲循环”（正样本）的单点数据时，使用 KTO 进行跨淡入淡出调优最为自然。</td>
    </tr>
    <tr>
      <td><code>#104</code></td>
      <td><strong><a href="https://arxiv.org/abs/2402.14740" target="_blank" rel="noopener">Back to Basics: Revisiting REINFORCE Style Optimization for Learning from Human Feedback</a></strong></td>
      <td>Arash Ahmadian et al. (Cohere For AI)</td>
      <td>提出 RLOO（REINFORCE Leave-One-Out）：回归经典的似然比策略梯度，利用同组其他样本的留一均值作为无偏基线剔除方差，证明了在离线对齐中简单基线完全匹敌复杂的 PPO。</td>
      <td>应用概率论方差缩减（Variance Reduction）的极佳教学范例。展现统计无偏估计量构造的代数技巧。</td>
    </tr>
    <tr>
      <td><code>#105</code></td>
      <td><strong><a href="https://arxiv.org/abs/1503.02531" target="_blank" rel="noopener">Distilling the Knowledge in a Neural Network</a></strong></td>
      <td>Geoffrey Hinton, Oriol Vinyals, Jeff Dean (Google, NIPS Workshop)</td>
      <td>知识蒸馏奠基之作：引入温度因子 T 软化教师模型的输出 Softmax 分布，使暗知识（Dark Knowledge，各非目标类别之间的相对几何概率）显式回传指导学生网络学习。</td>
      <td>课程模块 17 的理论源泉。在温度平滑下，交叉熵损失的梯度在小对数比值下渐进收敛为均方误差（MSE），揭示了软目标蒸馏的几何本质。</td>
    </tr>
    <tr>
      <td><code>#106</code></td>
      <td><strong><a href="https://arxiv.org/abs/1606.07947" target="_blank" rel="noopener">Sequence-Level Knowledge Distillation</a></strong></td>
      <td>Yoon Kim & Alexander M. Rush (Harvard, EMNLP)</td>
      <td>将蒸馏从单 token 概率分布扩展至整句轨迹序列：提出通过教师模型波束搜索（Beam Search）生成整句伪标签训练学生，打破了自回归暴露偏差（Exposure Bias）。</td>
      <td>大模型合成数据预训练（如 Phi 系列）的核心方法论先驱。在音频转场生成中，使用高规格离线算法生成全局最优过渡路径训练轻量化实时模型。</td>
    </tr>
    <tr>
      <td><code>#107</code></td>
      <td><strong><a href="https://arxiv.org/abs/2306.08543" target="_blank" rel="noopener">Knowledge Distillation of Large Language Models</a></strong></td>
      <td>Yuxian Gu et al. (Tsinghua, ICLR, MiniLLM)</td>
      <td>揭示了标准前向 KL 散度导致学生模型产生模式平均（Mode-Averaging）与低质量幻觉的问题，提出采用反向 KL 散度（Reverse KL）强迫学生模型精准聚焦于高密度单一模式（Mode-Seeking）。</td>
      <td>前向 KL 散度与反向 KL 散度在泛函极值上的几何差异（覆盖 vs 聚焦）的经典实证！直接指导如何防止生成模型产生浑浊含糊的杂音。</td>
    </tr>
    <tr>
      <td><code>#108</code></td>
      <td><strong><a href="https://arxiv.org/abs/2306.11644" target="_blank" rel="noopener">Textbooks Are All You Need</a></strong></td>
      <td>Suriya Gunasekar et al. (Microsoft Research, Phi-1)</td>
      <td>证明极高质量、合成生成的教科书级代码和数学练习题，能让仅 1.3B 参数的小模型在专业测试上碾压百倍规模的大模型，证明数据质量决定模型智能密度下界。</td>
      <td>彻底扭转“只迷信大数据量”的唯算力论。为 Charles 的跨学科研究指明方向：用高精度的数学物理方程生成合成数据集，远比盲目抓取低信噪比真实音频更高效。</td>
    </tr>
    <tr>
      <td><code>#109</code></td>
      <td><strong><a href="https://arxiv.org/abs/2401.10020" target="_blank" rel="noopener">Self-Rewarding Language Models</a></strong></td>
      <td>Weizhe Yuan et al. (Meta FAIR / NYU, ICML)</td>
      <td>提出自我奖励语言模型：在自回归迭代过程中让模型自身作为评判者为新生成的样本打分，迭代构建偏好对自我训练，探索智能自举（Self-Improvement）的理论上限。</td>
      <td>探索闭环正反馈系统的稳定性条件。防止模型自评判导致价值漂移的根本手段，仍然是引入物理不变量作为客观锚点。</td>
    </tr>
    <tr>
      <td><code>#110</code></td>
      <td><strong><a href="https://arxiv.org/abs/2408.03314" target="_blank" rel="noopener">Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters</a></strong></td>
      <td>Charlie Snell et al. (UC Berkeley)</td>
      <td>给出了推理时间计算量（Test-Time Compute）与预训练计算量在帕累托最优边界上的权衡曲线，证明对难度不同的问题自适应分配思考算力远胜无脑拉大模型。</td>
      <td>优化理论中经典的动态规划与自适应资源配置思想。针对简单音频段落使用极速查表，仅在复杂非对齐段落调用深度模型迭代。</td>
    </tr>
    <tr>
      <td><code>#111</code></td>
      <td><strong><a href="https://proceedings.neurips.cc/paper/2018/hash/3f19f5f1edd85d878445100f45c2612f-Paper.pdf" target="_blank" rel="noopener">Which Neural Net Architectures Give Rise to Exploding and Vanishing Gradients?</a></strong></td>
      <td>Boris Hanin (Princeton, NeurIPS)</td>
      <td>运用随机矩阵乘积与马尔可夫链极限定理，严格计算了任意深度前馈网络输入输出雅可比矩阵范数的期望与方差，给出了防止梯度消失与爆炸的临界初始化方差。</td>
      <td>纯数学测度与矩阵几何在深度网络中的高光展示。深入体会雅可比矩阵奇异值分布对多层反向传播稳定性的绝对支配地位。</td>
    </tr>
    <tr>
      <td><code>#112</code></td>
      <td><strong><a href="https://arxiv.org/abs/1711.04623" target="_blank" rel="noopener">Three Factors Influencing Minima in SGD: Learning Rate, Batch Size, and Second-Order Dynamics</a></strong></td>
      <td>Stanislaw Jastrzebski et al. (NYU / Jagiellonian)</td>
      <td>提出噪声比（Learning Rate / Batch Size）直接决定了随机梯度动力学在海森矩阵谱空间中的扩散半径，揭示了平坦极小值与泛化性能的内在定量纽带。</td>
      <td>直观解释了为何调整学习率时往往需要等比例缩放批大小（Linear / Square-root Scaling Rule）的微观几何动力学机制。</td>
    </tr>
    <tr>
      <td><code>#113</code></td>
      <td><strong><a href="https://arxiv.org/abs/1910.10683" target="_blank" rel="noopener">Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer</a></strong></td>
      <td>Colin Raffel et al. (Google Brain, JMLR, T5)</td>
      <td>系统性进行了深度学习历史上最严密的控制变量实验（Ablation Study）：系统评估了无监督目标、架构类型、预训练数据集清洗策略对下游迁移能力的独立贡献。</td>
      <td>剑桥乃至顶级科研界最为推崇的严密控制变量法实战范本。杜绝多变量同时改动导致结论无法归因的科研大忌。</td>
    </tr>
    <tr>
      <td><code>#114</code></td>
      <td><strong><a href="https://arxiv.org/abs/2304.01373" target="_blank" rel="noopener">Pythia: A Suite for Analyzing Large Language Models Across Training and Scaling</a></strong></td>
      <td>Stella Biderman et al. (EleutherAI, ICML)</td>
      <td>完全公开了从 70M 到 12B 跨越多个尺度的全生命周期 154 个训练检查点（Checkpoints）及确切数据加载顺序，为研究大模型训练动力学演进提供了可复现显微镜。</td>
      <td>深入观察模型在第几步学会词频统计、第几步学会句法规则、第几步学会高阶推理的相变时间线。</td>
    </tr>
    <tr>
      <td><code>#115</code></td>
      <td><strong><a href="https://arxiv.org/abs/2411.04330" target="_blank" rel="noopener">Scaling Laws for Precision: When Can We Train Low-Precision Models?</a></strong></td>
      <td>Arthur Douillard et al. (Hugging Face)</td>
      <td>给出了浮点精度比特数（Precision Bits）与计算最优缩放定律的统一解析函数，定量预测了在 FP8 与 FP4 条件下为了弥补精度损失所需追加的数据量补偿下限。</td>
      <td>为硬件算力与数值精度的折衷提供量化权衡公式，指导在计算资源受限时如何精准做架构抉择。</td>
    </tr>
    <tr>
      <td><code>#116</code></td>
      <td><strong><a href="https://arxiv.org/abs/2210.10760" target="_blank" rel="noopener">Scaling Laws for Reward Model Overoptimization</a></strong></td>
      <td>Leo Gao et al. (OpenAI, ICML)</td>
      <td>形式化验证了对齐中的古德哈特定律（Goodhart's Law）：当代理指标（奖励模型打分）被过度优化时，与真实人类客观偏好的相关性会出现先增后减的倒 U 型崩溃。</td>
      <td>极其深刻的哲学与统计学警示。在优化音频交叉过渡时，如果单一追求某种算法测量的“平滑度分”，最终可能会生成毫无节奏生气的单调声音。</td>
    </tr>
    <tr>
      <td><code>#117</code></td>
      <td><strong><a href="https://arxiv.org/abs/2305.10589" target="_blank" rel="noopener">What Can Transformers Learn In-Context? A Mathematical Perspective</a></strong></td>
      <td>Zeyuan Allen-Zhu & Yuanzhi Li (Meta AI / CMU)</td>
      <td>从理论上证明预训练自注意力机制隐式地在残差流中实现了梯度下降算子与岭回归优化器，上下文学习（ICL）本质是在执行元优化。</td>
      <td>展现前向自注意力等价于优化算法迭代的深刻洞察。为无梯度上下文自适应转场算法提供第一性原理背书。</td>
    </tr>
    <tr>
      <td><code>#118</code></td>
      <td><strong><a href="https://arxiv.org/abs/2304.15004" target="_blank" rel="noopener">Are Emergent Abilities of Large Language Models an Illusion of the Metric?</a></strong></td>
      <td>Rylan Schaeffer, Brando Miranda, Sanmi Koyejo (Stanford, NeurIPS Best Paper)</td>
      <td>利用非线性度量失真定理证明：大模型看似跳跃突变的所谓“涌现能力”，大多是由非连续不平滑的评估指标（如准确率阶跃函数）人为造成的测量假象，在连续平滑度量下能力是严格单调线性增长的。</td>
      <td>大语言模型严谨评估方法论。揭示固定基准评测泄漏风险，提出鲁棒与多维度的量化评测体系。</td>
    </tr>
    <tr>
      <td><code>#119</code></td>
      <td><strong><a href="https://arxiv.org/abs/1904.08779" target="_blank" rel="noopener">SpecAugment: A Simple Data Augmentation Method for Deep Learning Audio</a></strong></td>
      <td>Daniel S. Park et al. (Google Brain, Interspeech)</td>
      <td>打破在时域进行数据增强的常规，直接在时频谱（Log-Mel Spectrogram）上执行随机时间通道与频率通道掩蔽（Masking），显著提升声学模型对丢包与共振峰偏移的鲁棒性。</td>
      <td>优雅的特征空间不变性注入。为音频连续建模训练提供了零额外算力开销的强效正则化手段。</td>
    </tr>
    <tr>
      <td><code>#120</code></td>
      <td><strong><a href="https://arc.net/folder/D2C17D16-6C40-47F5-82A1-039B64D92B60" target="_blank" rel="noopener">30 Recommended Readings in Machine Learning & Information Theory</a></strong></td>
      <td>Ilya Sutskever (OpenAI / SSI Co-founder)</td>
      <td>Ilya Sutskever 亲选的核心阅读清单：强调从柯尔莫哥洛夫复杂度、递归神经网络与信息压缩第一性原理把握智能的本质。</td>
      <td>顶级科学家的品味标尺。提醒所有有志于剑桥数学与前沿科学计算的学子：掌握底层公理化体系，远胜追逐快餐式应用 API。</td>
    </tr>
  </tbody>
</table>

<h4>1.4 支柱四 · 基础设施与系统工程（内存层级、并行切分、算子融合与集群网络 40 篇）</h4>
<p>
  离开硬件的算法只是空想。从 GPU SRAM 缓存分块（FlashAttention）、KV Cache 虚拟分页（PagedAttention），到 1F1B 流水线编排与导轨优化无阻塞网络，这一支柱构筑了现代大规模 AI 的物理坚实底座。
</p>
<table class="tbl small">
  <thead><tr><th>序号</th><th>文献 / 课程 / 报告</th><th>机构 / 作者</th><th>核心数学与工程结论</th><th>核心数学与研读启示</th></tr></thead>
  <tbody>
    <tr>
      <td><code>#121</code></td>
      <td><strong><a href="https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1" target="_blank" rel="noopener">Computer Architecture: A Quantitative Approach (6th Edition)</a></strong></td>
      <td>John L. Hennessy & David A. Patterson (Stanford / Berkeley, Turing Award)</td>
      <td>体系结构图灵奖经典著作：阿姆达尔定律（Amdahl's Law）、内存墙（Memory Wall）、缓存一致性协议、SIMD 向量流水线与屋顶模型（Roofline Model）。</td>
      <td>理解算力受限（Compute-bound）与内存带宽受限（Memory-bound）的物理边界。算术强度（FLOPs/Byte）直接决定代码在 GPU 上的执行瓶颈。</td>
    </tr>
    <tr>
      <td><code>#122</code></td>
      <td><strong><a href="https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/" target="_blank" rel="noopener">NVIDIA Hopper Architecture In-Depth</a></strong></td>
      <td>NVIDIA Architecture Architecture Group</td>
      <td>解构 H100 核心架构：第四代 Tensor Core、异步张量内存加速器（TMA）、分布式共享内存（DSMEM）以及 Transformer Engine 动态浮点格式缩放。</td>
      <td>FlashAttention-3 能够在 Hopper 上达到 80% 峰值硬件利用率的物理硬件底座，深入体会软硬件协同设计的极致魅力。</td>
    </tr>
    <tr>
      <td><code>#123</code></td>
      <td><strong><a href="https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/" target="_blank" rel="noopener">NVIDIA Blackwell Architecture Whitepaper</a></strong></td>
      <td>NVIDIA</td>
      <td>单芯片容纳 2080 亿晶体管，第二代 Transformer Engine 原生支持 FP4 微缩放格式，第五代 NVLink 提供 1.8TB/s 双向互联带宽，构建 NVL72 液冷机架超级计算机。</td>
      <td>展现当前人类算力工程的最高物理奇迹，明确系统工程如何通过极速网络交换机打破单机显存容量极限。</td>
    </tr>
    <tr>
      <td><code>#124</code></td>
      <td><strong><a href="https://arxiv.org/abs/1704.04760" target="_blank" rel="noopener">In-Datacenter Performance Analysis of a Tensor Processing Unit</a></strong></td>
      <td>Norman P. Jouppi et al. (Google, ISCA)</td>
      <td>Google 首个张量处理单元（TPU v1-v5e）架构解剖：脉动阵列（Systolic Array）直接将中间计算结果在处理单元网格内直连传递，将访存功耗降至传统体系结构的数十分之一。</td>
      <td>矩阵乘法计算在硬件二维网格上流动的时间-空间几何直觉；课程模块 06 JAX AI Stack 面向 TPU 编程的硬件背景。</td>
    </tr>
    <tr>
      <td><code>#125</code></td>
      <td><strong><a href="https://arxiv.org/abs/1909.08053" target="_blank" rel="noopener">Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism</a></strong></td>
      <td>Mohammad Shoeybi et al. (NVIDIA)</td>
      <td>提出张量模型并行（Tensor Parallelism, TP）：将自注意力 Q/K/V 权重按列切分（Column Parallel），投影层 W_O 按行切分（Row Parallel），在一个前向传播中仅需一次 AllReduce 集合通信。</td>
      <td>课程模块 06 并行切分的核心数学推导。必须能证明按列切分接按行切分后无需中间通信即可完成自注意力块计算。</td>
    </tr>
    <tr>
      <td><code>#126</code></td>
      <td><strong><a href="https://arxiv.org/abs/1906.02066" target="_blank" rel="noopener">PipeDream: Generalized Pipeline Parallelism for DNN Training</a></strong></td>
      <td>Deepak Narayanan et al. (Stanford / Microsoft Research, SOSP)</td>
      <td>提出流水线并行 1F1B（One Forward One Backward）调度编排策略：交替执行前向与反向微批次，将流水线气泡率（Bubble Ratio）压缩至最低，大幅降低激活显存常驻开销。</td>
      <td>经典排队论与离散事件系统调度的数学应用。推导气泡比公式 (p-1)/(m+p-1)，掌握分布式系统的延迟隐藏技巧。</td>
    </tr>
    <tr>
      <td><code>#127</code></td>
      <td><strong><a href="https://arxiv.org/abs/1910.02054" target="_blank" rel="noopener">ZeRO: Memory Optimizations Toward Training Trillion Parameter Models</a></strong></td>
      <td>Samyam Rajbhandari et al. (Microsoft, SC)</td>
      <td>提出零冗余优化器（ZeRO）：Stage 1 分片优化器状态（4x 显存缩减）、Stage 2 分片梯度（8x 缩减）、Stage 3 分片模型参数（无损线性扩展），彻底打破单卡显存墙。</td>
      <td>理解当代大模型分布式训练显存分配的绝对基石！推导 16P 显存占用公式（FP16 权重、梯度与 AdamW 优化器状态）。</td>
    </tr>
    <tr>
      <td><code>#128</code></td>
      <td><strong><a href="https://arxiv.org/abs/2304.11277" target="_blank" rel="noopener">PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel</a></strong></td>
      <td>Yanli Zhao et al. (Meta AI, VLDB)</td>
      <td>工业级全分片数据并行（FSDP）在 PyTorch 原生生态中的高性能实现：通过分层通信重叠、向前预取（Prefetching）与动态激活检查点（Activation Checkpointing）兼顾极大规模与吞吐。</td>
      <td>当代开源训练的核心主力工具。理解其内部如何在每个计算层前后利用 AllGather 收集权重，并在计算完成后立即释放以维持常数显存。</td>
    </tr>
    <tr>
      <td><code>#129</code></td>
      <td><strong><a href="https://arxiv.org/abs/2105.04663" target="_blank" rel="noopener">GSPMD: General and Scalable Parallelization for ML Computation Graphs</a></strong></td>
      <td>Yuanzhong Xu et al. (Google, arXiv)</td>
      <td>提出基于张量维度的通用自动并行系统：通过声明式维度分区注解（Mesh & PartitionSpec），编译器利用模式匹配自动插入通信原语，支持一维至多维复杂并行混合。</td>
      <td>JAX AI Stack 的核心灵魂。让应用算法代码与底层物理卡数完全解耦，也是实验 E6 JAX 代码编写的核心依据。</td>
    </tr>
    <tr>
      <td><code>#130</code></td>
      <td><strong><a href="https://arxiv.org/abs/2205.14135" target="_blank" rel="noopener">FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness</a></strong></td>
      <td>Tri Dao, Daniel Y. Fu et al. (Stanford, NeurIPS)</td>
      <td>体系结构感知计算的里程碑突破：利用 Online Softmax 分块增量归一化，在快速片上 SRAM 中完成矩阵分块乘法并动态累加，完全不物化庞大的 T x T 注意力矩阵，显存减少一个数量级，速度提升数倍。</td>
      <td>算法优化的物理学胜利！Online Softmax 的代数递推公式：利用全局最大值与指数归一化因子的标量递推保持严格无损数学等价。</td>
    </tr>
    <tr>
      <td><code>#131</code></td>
      <td><strong><a href="https://arxiv.org/abs/2307.08691" target="_blank" rel="noopener">FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning</a></strong></td>
      <td>Tri Dao (Princeton, ICLR)</td>
      <td>重新设计工作线程分工：将序列长度维度并行外层循环移至内层，优化 Warp 级别的数据通信，消除非必要共享内存读写，算力利用率由 35% 飙升至理论峰值的 73%。</td>
      <td>深入 GPU 线程块（ThreadBlock）与 Warp 调度逻辑，展现如何在指令级流水线上压榨寄存器吞吐。</td>
    </tr>
    <tr>
      <td><code>#132</code></td>
      <td><strong><a href="https://arxiv.org/abs/2407.08608" target="_blank" rel="noopener">FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-Precision on Hopper</a></strong></td>
      <td>Jay Shah et al. (Colfax / Meta / Princeton)</td>
      <td>全面释放 NVIDIA Hopper 特性：结合 TMA 异步直接内存访问、Tensor Core 与 TMA 的 Warp 角色交错解耦（Producer-Consumer 模型），以及 FP8 动态块量化，逼近物理硬件极速。</td>
      <td>当前单 GPU 算子优化的绝对天花板，展现微架构深度调优对现代大模型基础设施的决定性赋能。</td>
    </tr>
    <tr>
      <td><code>#133</code></td>
      <td><strong><a href="https://www.eecs.harvard.edu/~htk/publication/2019-mapl-tillet-kung-cox.pdf" target="_blank" rel="noopener">Triton: An Intermediate Language and Compiler for Tiled Neural Network Computations</a></strong></td>
      <td>Philippe Tillet et al. (OpenAI / Harvard)</td>
      <td>提出基于块（Block-level）的中间表示与自动调优编译器：让研究人员用类 Python 语法编写自定义高性能 GPU 算子，由编译器自动处理内存合并、共享内存双缓冲与指令流水线编排。</td>
      <td>OpenAI 开源的高性能 GPU 编程语言。以接近纯 Python 语法编写编译出媲美手写 CUDA 的核函数。</td>
    </tr>
    <tr>
      <td><code>#134</code></td>
      <td><strong><a href="https://arxiv.org/abs/2309.06180" target="_blank" rel="noopener">Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM)</a></strong></td>
      <td>Woosuk Kwon et al. (UC Berkeley, SOSP)</td>
      <td>借鉴操作系统虚拟内存分页机制提出 PagedAttention：将动态变长的 KV Cache 切割为离散块（Block-table）进行非连续物理显存管理，彻底消灭显存内部碎片，使推理并发吞吐提升 2-4 倍。</td>
      <td>操作系统经典分页算法与现代深度学习系统的完美结合。课程模块 08 与实验 E8 第二部分评测的核心对象。</td>
    </tr>
    <tr>
      <td><code>#135</code></td>
      <td><strong><a href="https://github.com/NVIDIA/TensorRT-LLM" target="_blank" rel="noopener">TensorRT-LLM: A High-Performance Library for LLM Inference</a></strong></td>
      <td>NVIDIA Systems Architecture Group</td>
      <td>结合连续批处理（Continuous / In-Flight Batching）、KV 缓存量化（FP8/INT8）、张量并行算子深度融合与微架构优化，构建最强单机多卡生产级部署推理流水线。</td>
      <td>工业级 LLM 部署的工业标杆，理解生产环境中动态请求到达下的资源调度排队论模型。</td>
    </tr>
    <tr>
      <td><code>#136</code></td>
      <td><strong><a href="https://link.springer.com/article/10.1007/s10766-005-3580-3" target="_blank" rel="noopener">Optimization of Collective Communication Operations in MPICH</a></strong></td>
      <td>Rajeev Thakur, Rolf Rabenseifner, William Gropp (Argonne / UIUC, IJHPCA)</td>
      <td>集合通信经典数学专著：推导环形全规约（Ring-AllReduce）、递归加倍（Recursive Doubling）与两阶段算法的传输延迟与带宽消耗，证明长消息下环形拓扑通信量与节点数 N 无关的恒定性。</td>
      <td>分布式系统通信算法的数学推导黄金标准！必须手推环形 AllReduce 传输数据量 2*(N-1)/N * S 的证明过程。</td>
    </tr>
    <tr>
      <td><code>#137</code></td>
      <td><strong><a href="https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/overview.html" target="_blank" rel="noopener">NCCL (NVIDIA Collective Communications Library) Developer Architecture Guide</a></strong></td>
      <td>NVIDIA</td>
      <td>揭示 GPU 集群跨 NVLink 与 InfiniBand 的集合通信拓扑构建细节：自动探测节点内拓扑并构建双向环（Dual Rings）与树（Trees），利用 GPU Kernel 直接驱动 DMA 进行低延迟高带宽数据汇聚。</td>
      <td>任何大规模多卡集群训练出现通信挂起（NCCL Timeout）时的底层诊断手册，理解 PCIe 拓扑与 NUMA 绑定的物理重要性。</td>
    </tr>
    <tr>
      <td><code>#138</code></td>
      <td><strong><a href="https://arxiv.org/abs/2202.07848" target="_blank" rel="noopener">SpotCheck & Singularity: Scheduling and Fault Tolerance for Hyperscale AI Training</a></strong></td>
      <td>Jayashree Mohan et al. (Microsoft Research / CMU, EuroSys)</td>
      <td>解构超大规模 GPU 集群故障排查与弹性调度：针对静默数据损坏（Silent Data Corruption, SDC）、单卡掉线与断点恢复开销，提出秒级全局快照与透明迁移机制。</td>
      <td>真实世界工程挑战认知：千卡集群平均数十小时就会发生一次硬件错误，容错体系是理论模型走向生产的护城河。</td>
    </tr>
    <tr>
      <td><code>#139</code></td>
      <td><strong><a href="https://engineering.fb.com/2024/08/05/data-center-engineering/meta-artificial-intelligence-cluster-network-architecture/" target="_blank" rel="noopener">Rail-Optimized Network Topologies for Large-Scale AI Clusters</a></strong></td>
      <td>Anurag Mudigonda et al. (Meta Platforms)</td>
      <td>深度拆解 Meta 24,000 卡 GPU 集群网络拓扑：通过导轨优化（Rail-Optimized）胖树架构使得张量并行与流水线并行的集合通信严格局限在同轨交换机内，彻底消除拥塞与跨轨抖动。</td>
      <td>图论与网络拓扑学在现代超级数据中心的应用典范，展示物理布线如何反哺并行算法设计。</td>
    </tr>
    <tr>
      <td><code>#140</code></td>
      <td><strong><a href="https://arxiv.org/abs/2211.17192" target="_blank" rel="noopener">Fast Inference from Transformers via Speculative Decoding</a></strong></td>
      <td>Yaniv Leviathan, Matan Kalman, Yossi Matias (Google Research, ICML)</td>
      <td>提出投机解码（Speculative Decoding）：由一个小规模快速草稿模型（Draft Model）生成 K 个候选 token，再由目标大模型并行单次前向进行拒绝采样验证，严格数学保证输出概率分布无损且提速 2-3 倍。</td>
      <td>推测采样加速解码革命。用小模型产出草稿 Token，大模型并行单步批量验证，无损提升 2-3 倍推理速度。</td>
    </tr>
    <tr>
      <td><code>#141</code></td>
      <td><strong><a href="https://arxiv.org/abs/2302.01318" target="_blank" rel="noopener">Accelerating Large Language Model Decoding with Speculative Sampling</a></strong></td>
      <td>Charlie Chen et al. (DeepMind)</td>
      <td>独立提出投机采样（Speculative Sampling），给出拒绝采样的严格马尔可夫链接受概率分布证明，指出接受率直接取决于草稿模型与目标模型之间的总变差距离（Total Variation Distance）。</td>
      <td>深入掌握 TV 距离在量化两个离散概率测度相似性时的控制作用，为推理加速系统提供紧致的理论加速比界限。</td>
    </tr>
    <tr>
      <td><code>#142</code></td>
      <td><strong><a href="https://arxiv.org/abs/2401.18079" target="_blank" rel="noopener">KVquant: Towards 10 Million Context Length LLM Inference with KV Cache Quantization</a></strong></td>
      <td>Coleman Hooper et al. (UC Berkeley, NeurIPS)</td>
      <td>将 KV Cache 量化推向极限：结合非均匀分位数归一化、每通道异常值隔离与 3-bit / 4-bit 稀疏编码，实现千万级超长上下文在单台服务器内存中的无损加载。</td>
      <td>长音频历史状态常驻显存时的终极优化方案，展现数值统计分析与硬件访存结合的力量。</td>
    </tr>
    <tr>
      <td><code>#143</code></td>
      <td><strong><a href="https://fizzbee.io/" target="_blank" rel="noopener">FizzBee: Formally Specifying and Model Checking Distributed Systems</a></strong></td>
      <td>Keisuke Kamahori et al. (CMU)</td>
      <td>面向分布式共识、通信状态机与并发流水线的形式化规范与模型检验工具，用状态转移图穷举检测死锁（Deadlock）与竞态条件（Race Conditions）。</td>
      <td>形式化软件工程与严格证明范式。用数理逻辑验证复杂并发系统的正确性。</td>
    </tr>
    <tr>
      <td><code>#144</code></td>
      <td><strong><a href="https://arxiv.org/abs/2303.06865" target="_blank" rel="noopener">FlexGen: High-Throughput Generative Inference of Large Language Models with a Single GPU</a></strong></td>
      <td>Ying Sheng et al. (Stanford, ICML)</td>
      <td>将显存-内存-SSD 构成的三级存储层级建模为线性整数规划问题（Linear Integer Programming），推导出全局吞吐最优的张量块存储与预取调度方案，单张 16GB 显卡跑动 175B 模型。</td>
      <td>经典运筹学图论求解资源受限吞吐调度的杰作，展现非渐近最优化方法在边缘硬件算力榨取中的威力。</td>
    </tr>
    <tr>
      <td><code>#145</code></td>
      <td><strong><a href="https://arxiv.org/abs/2305.14314" target="_blank" rel="noopener">QLoRA: Efficient Finetuning of Quantized LLMs</a></strong></td>
      <td>Tim Dettmers et al. (Washington, NeurIPS)</td>
      <td>提出 QLoRA：基于正态分布理论推导出最优信息量量化类型 NormalFloat4 (NF4)、双重量化（Double Quantization）压缩常数缩放开销，并在反向传播中解量化，使单张 24GB 消费级显卡可微调 65B 模型。</td>
      <td>课程模块 07 与附录 B 实验 E4 的理论基石。必须透彻理解 NF4 将理论高斯分布按等分位数截断的数学推导。</td>
    </tr>
    <tr>
      <td><code>#146</code></td>
      <td><strong><a href="https://web.stanford.edu/class/cs224n/" target="_blank" rel="noopener">CS224N: Natural Language Processing with Deep Learning</a></strong></td>
      <td>Christopher D. Manning et al. (Stanford University)</td>
      <td>全球 NLP 与语言建模头牌公开课：从 Word2Vec 词向量微积分、反向传播矩阵求导、RNN 到现代 Transformer 架构与对齐全景。</td>
      <td>系统学习词嵌入几何、梯度求导与软注意力的最佳殿堂级视频课程，课后作业手写求导对 Cambridge STEP 数学考生极其友好。</td>
    </tr>
    <tr>
      <td><code>#147</code></td>
      <td><strong><a href="https://stanford-cs336.github.io/spring2024/" target="_blank" rel="noopener">CS336: Language Modeling from Scratch</a></strong></td>
      <td>Pratyush Patel, Arun Dunna et al. (Stanford University)</td>
      <td>斯坦福全新顶级硬核课程：要求学生完全从零开始手写 BPE 分词器、Transformer 算子、FlashAttention、Megatron-LM 并行系统并在集群上完成训练。</td>
      <td>本课程内容体系的最直接对照参考课程！CS336 的作业规范与代码严谨性正是本课程各模块与实验 E1-E8 的设计标杆。</td>
    </tr>
    <tr>
      <td><code>#148</code></td>
      <td><strong><a href="http://phontron.com/class/anlp2024/" target="_blank" rel="noopener">CS 11-711: Advanced Natural Language Processing</a></strong></td>
      <td>Graham Neubig et al. (Carnegie Mellon University)</td>
      <td>CMU 语言技术研究所（LTI）高阶公开课：深入前沿模型缩放、检索增强生成（RAG）、Agent 推理机制与自动化评测方法论。</td>
      <td>对标课程模块 18-20。适合在完成基础理论后，追踪当前最前沿学术研讨课的必选项目。</td>
    </tr>
    <tr>
      <td><code>#149</code></td>
      <td><strong><a href="http://rail.eecs.berkeley.edu/deeprlcourse/" target="_blank" rel="noopener">CS285: Deep Reinforcement Learning</a></strong></td>
      <td>Sergey Levine et al. (UC Berkeley)</td>
      <td>强化学习领域公认第一公开课：涵盖策略梯度定理、值函数逼近、Actor-Critic、自然策略梯度（TRPO）以及基于模型的强化学习（MBRL）。</td>
      <td>深入理解 PPO、DPO 与 GRPO 背后的测度变换与马尔可夫决策过程（MDP）动力学数学推导的首选学术殿堂。</td>
    </tr>
    <tr>
      <td><code>#150</code></td>
      <td><strong><a href="http://introtodeeplearning.com/" target="_blank" rel="noopener">6.S191: Introduction to Deep Learning</a></strong></td>
      <td>Alexander Amini & Ava Soleimany (MIT)</td>
      <td>MIT 官方深度学习导论：高质量动画与公式推导并重，详尽覆盖卷积、循环、注意力模型以及音频和生成式前沿。</td>
      <td>对于构建全局心智模型极其高效，尤其是其关于音频波形与声学特征时序生成的章节值得重点观摩。</td>
    </tr>
    <tr>
      <td><code>#151</code></td>
      <td><strong><a href="https://karpathy.ai/zero-to-hero.html" target="_blank" rel="noopener">Neural Networks: Zero to Hero (nanoGPT & micrograd)</a></strong></td>
      <td>Andrej Karpathy (Eureka Labs / OpenAI)</td>
      <td>全球公认最优秀的白手起家实现系列：从零手写标量自动微分引擎 micrograd，手写 bigram、MLP、BPE 分词器 minbpe 到完整跑通 nanoGPT。</td>
      <td>与本课程附录 B 实验 E1-E3 紧密契合。每行代码完全透明、无任何第三方封装黑盒，是建立代码级自信的最佳入口。</td>
    </tr>
    <tr>
      <td><code>#152</code></td>
      <td><strong><a href="https://course.fast.ai/" target="_blank" rel="noopener">Practical Deep Learning for Coders</a></strong></td>
      <td>Jeremy Howard et al. (Fast.ai)</td>
      <td>自顶向下的极佳工程实战课：推崇快速跑通最小可复现模型，强调学习率搜索（LR Finder）、权重衰减与数据清洗在工程中的实际成效。</td>
      <td>培养敏锐的工程调优直觉，迅速建立“写 20 行最小代码验证假设”的极客实践习惯。</td>
    </tr>
    <tr>
      <td><code>#153</code></td>
      <td><strong><a href="https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/" target="_blank" rel="noopener">Designing Machine Learning Systems</a></strong></td>
      <td>Chip Huyen (Stanford / Claypot AI, O'Reilly)</td>
      <td>系统剖析企业级端到端 ML 系统工程：数据流水线分布偏移（Data Drift）、特征存储、流式计算系统、监控与持续部署。</td>
      <td>工业级模型服务架构指南。深入讲解动态批处理、连续批处理与长连接微服务的低延迟工程范式。</td>
    </tr>
    <tr>
      <td><code>#154</code></td>
      <td><strong><a href="https://www.aisafetybook.com/" target="_blank" rel="noopener">Introduction to AI Safety, Ethics, and Society</a></strong></td>
      <td>Dan Hendrycks et al. (Center for AI Safety / UC Berkeley)</td>
      <td>系统性阐述 AI 安全性前沿：对抗攻击、奖励黑客行为（Reward Hacking）、模型内部可解释性、涌现欺骗以及模型权重合规准则。</td>
      <td>对标课程模块 21 与附录 D，为剑桥大学学术面试中极高频出现的技术伦理与系统安全性问题提供扎实学术口径。</td>
    </tr>
    <tr>
      <td><code>#155</code></td>
      <td><strong><a href="https://openai.com/research/" target="_blank" rel="noopener">OpenAI Research Publications Compendium</a></strong></td>
      <td>OpenAI Research Team</td>
      <td>汇总从 GPT-1/2/3/4、InstructGPT、DALL-E、Whisper 到 o1/o3 的完整开创性技术报告与研究论文档案库。</td>
      <td>追踪现代人工智能产业每一次范式转移的原始发源地，查阅一手系统卡（System Card）与工程附录数据。</td>
    </tr>
    <tr>
      <td><code>#156</code></td>
      <td><strong><a href="https://deepmind.google/research/publications/" target="_blank" rel="noopener">Google DeepMind Research Publications</a></strong></td>
      <td>Google DeepMind</td>
      <td>涵盖 AlphaGo、AlphaFold、WaveNet、Chinchilla Scaling Laws、Gemini 系列模型等人类尖端科学发现与通用智能报告。</td>
      <td>WaveNet 与现代音频神经合成模型的理论策源地。深入研读其将数学物理结构注入深度学习的宏大科学品味。</td>
    </tr>
    <tr>
      <td><code>#157</code></td>
      <td><strong><a href="https://www.anthropic.com/research" target="_blank" rel="noopener">Anthropic Core Research Papers & Interpretability</a></strong></td>
      <td>Anthropic Research</td>
      <td>以 Constitutional AI、Scaling Laws 与单语义神经元可解释性（Monosemanticity / Dictionary Learning）为核心的前沿安全与机理研究。</td>
      <td>用高维稀疏自动编码器（SAE）解构 Transformer 内部黑盒激活的数学前沿，对剑桥应用数学考生极具启发。</td>
    </tr>
    <tr>
      <td><code>#158</code></td>
      <td><strong><a href="https://ai.meta.com/research/" target="_blank" rel="noopener">Meta Fundamental AI Research (FAIR) Open Science</a></strong></td>
      <td>Meta FAIR</td>
      <td>开源生态最主要基石提供者：PyTorch 核心框架、LLaMA 系列、AudioCraft、Segment Anything 等全栈开源研究白皮书。</td>
      <td>所有技术文档与预训练权重完全可复现，是个人开发者与学术申请者最值得深挖的开源沃土。</td>
    </tr>
    <tr>
      <td><code>#159</code></td>
      <td><strong><a href="https://huggingface.co/docs" target="_blank" rel="noopener">Hugging Face Open-Source AI Ecosystem Documentation</a></strong></td>
      <td>Hugging Face Team</td>
      <td>工业界与学术界通用的统一接口事实标准：Transformers、TRL、PEFT、Datasets、Accelerate、Tokenizers 模块化文档库。</td>
      <td>全课程动手实验的代码基座，指导完成从单卡原型向多卡分布式环境的平滑迁移。</td>
    </tr>
    <tr>
      <td><code>#160</code></td>
      <td><strong><a href="https://docs.jaxstack.ai/en/latest/" target="_blank" rel="noopener">JAX AI Stack Documentation & Tutorials</a></strong></td>
      <td>JAX Core Team (Google)</td>
      <td>纯函数式自动微分与 XLA 编译器的优雅结晶：JAX、Flax NNX、Optax、Orbax、Grain 构成的次世代科学计算与高并发大模型栈。</td>
      <td>实验 E6 的核心战场！函数可组合变换（jit, grad, vmap, pmap）与微分流形上的数学思维完全一体，是剑桥数学系学子的最舒适编程乐园。</td>
    </tr>
  </tbody>
</table>

<h3>2. 四条工程信息源，四种落地问题</h3>
<div class="grid2">
  <div class="card">
    <h5>TRL 文档 —— 操作手册</h5>
    <p><strong>回答「怎么做」</strong>。当你要求做 SFT / DPO / GRPO / 蒸馏，这里是唯一的权威：
      Trainer 的每个参数、数据集该长什么样、怎么省显存、怎么上多卡。</p>
    <p><strong>用法</strong>：Quickstart 跑通最小例子 → 直接跳到对应 Trainer 页 → 出问题再读 How-to。
      <em>不要</em>从头读到尾，它不是教材。</p>
  </div>
  <div class="card">
    <h5>Hugging Face Learn —— 系统教材</h5>
    <p><strong>回答「这是什么、为什么」</strong>。LLM Course 与 Agents Course 有完整的章节编排、
      可运行的 notebook 和测验，适合用来补概念的洞。</p>
    <p><strong>用法</strong>：按章读，但只为补洞而读。你已经懂的章节直接跳过，
      把时间留给第 5、6、11 章这些与动手直接相关的部分。</p>
  </div>
  <div class="card">
    <h5>JAX AI Stack —— 第二个生态的对照</h5>
    <p><strong>回答「同一件事换一套工具怎么写」</strong>。它的 miniGPT 教程是 NNX + Optax + Grain 的
      官方范例，并且明确覆盖了 <span class="t" data-tterm="SPMD" data-d="Single Program Multiple Data：同一份程序在不同设备上处理不同数据分片。JAX 通过 Mesh 与 PartitionSpec 让编译器自动完成切分。">SPMD</span>
      并行与 mesh 配置。</p>
    <p><strong>用法</strong>：在完成 PyTorch 版 miniGPT（实验 E3）之后读，边读边填附录 B 里的对照表。</p>
  </div>
  <div class="card">
    <h5>Google Colab —— 把代码跑起来</h5>
    <p><strong>回答「它到底能不能跑」</strong>。所有文档都可能在版本、显存、驱动上与你的现实不符，
      只有 Colab 的实际输出算数。</p>
    <p><strong>用法</strong>：每个实验开始前先跑一次环境检查（<code>!nvidia-smi</code>、
      <code>jax.devices()</code>、<code>pip show trl</code>），把结论写进实验记录。</p>
  </div>
</div>

<h4>遇到问题时，按这个顺序查</h4>
<div class="flow">
  <div class="nd hi">报错信息</div><div class="ar">→</div>
  <div class="nd">库的 Quickstart / Troubleshoot</div><div class="ar">→</div>
  <div class="nd">对应 Trainer / API 页</div><div class="ar">→</div>
  <div class="nd">How-to 指南</div><div class="ar">→</div>
  <div class="nd">自己写 20 行最小复现</div><div class="ar">→</div>
  <div class="nd">才去搜视频或论坛</div>
</div>
<p>
  注意最后一步的位置：<strong>视频与论坛是最后手段，不是第一手段</strong>。
  原因很简单——文档是版本化的、可检索的、可引用的；视频是一维的、不可检索的，
  而且它的时效性藏在出版日期里。
</p>

<h3>3. 表 1 · Hugging Face 生态地图</h3>
<table class="tbl small">
  <thead><tr><th>库 / 产品</th><th>是什么</th><th>什么时候用</th><th>在哪读</th></tr></thead>
  <tbody>
    <tr>
      <td><code>transformers</code></td>
      <td>模型与 tokenizer 的统一接口，一切的地基</td>
      <td>载入任何预训练模型、写前向、做推理</td>
      <td><a href="https://huggingface.co/docs/transformers/index" target="_blank" rel="noopener">docs/transformers</a></td>
    </tr>
    <tr>
      <td><code>datasets</code></td>
      <td>Arrow 支撑的数据集库，内存映射、可流式</td>
      <td>载入 Hub 数据、做 <code>map</code> 预处理、切分</td>
      <td><a href="https://huggingface.co/docs/datasets/index" target="_blank" rel="noopener">docs/datasets</a></td>
    </tr>
    <tr>
      <td><code>tokenizers</code></td>
      <td>Rust 实现的分词器，BPE / WordPiece / Unigram</td>
      <td>自己训词表、研究分词行为（实验 E2）</td>
      <td><a href="https://huggingface.co/docs/tokenizers/index" target="_blank" rel="noopener">docs/tokenizers</a></td>
    </tr>
    <tr>
      <td><code>accelerate</code></td>
      <td>把「单卡脚本」变成「多卡 / 混合精度」的抽象层</td>
      <td>同一份训练脚本要跑在不同硬件上</td>
      <td><a href="https://huggingface.co/docs/accelerate/index" target="_blank" rel="noopener">docs/accelerate</a></td>
    </tr>
    <tr>
      <td><code>peft</code></td>
      <td>参数高效微调：LoRA / DoRA / IA3 / 提示微调</td>
      <td>显存不够全量微调，或需保存小体积 adapter（E4）</td>
      <td><a href="https://huggingface.co/docs/peft/index" target="_blank" rel="noopener">docs/peft</a></td>
    </tr>
    <tr>
      <td><code>trl</code></td>
      <td>后训练全套：SFT / DPO / GRPO / KTO / RLOO / 奖励模型 / 蒸馏</td>
      <td>做对齐训练，从监督微调到偏好优化（E4、E5）</td>
      <td><a href="https://huggingface.co/docs/trl/index" target="_blank" rel="noopener">docs/trl</a></td>
    </tr>
    <tr>
      <td><code>evaluate</code></td>
      <td>统一的指标接口（accuracy、BLEU、perplexity 等）</td>
      <td>需要与论文或他人结果对齐指标定义时</td>
      <td><a href="https://huggingface.co/docs/evaluate/index" target="_blank" rel="noopener">docs/evaluate</a></td>
    </tr>
    <tr>
      <td><code>bitsandbytes</code></td>
      <td>k-bit 量化：8-bit 优化器、LLM.int8()、NF4（QLoRA）</td>
      <td>4-bit 加载推理、QLoRA 微调（E8）</td>
      <td><a href="https://huggingface.co/docs/bitsandbytes/index" target="_blank" rel="noopener">docs/bitsandbytes</a></td>
    </tr>
    <tr>
      <td><code>safetensors</code></td>
      <td>安全的张量序列化格式，替代 pickle</td>
      <td>发布权重、避免反序列化执行任意代码</td>
      <td><a href="https://huggingface.co/docs/safetensors/index" target="_blank" rel="noopener">docs/safetensors</a></td>
    </tr>
    <tr>
      <td><code>vLLM</code></td>
      <td>高吞吐推理引擎，PagedAttention + 连续批处理</td>
      <td>自建服务、测吞吐与延迟（E8）</td>
      <td><a href="https://docs.vllm.ai/en/latest/" target="_blank" rel="noopener">docs.vllm.ai</a></td>
    </tr>
    <tr>
      <td>Hub（模型 / 数据集）</td>
      <td>权重与数据的托管、版本管理、模型卡</td>
      <td>找基座模型、找数据集、发布你的 adapter</td>
      <td><a href="https://huggingface.co/docs/hub/index" target="_blank" rel="noopener">docs/hub</a></td>
    </tr>
    <tr>
      <td>Jobs</td>
      <td>在 Hugging Face 托管的算力上跑训练脚本</td>
      <td>本地与 Colab 都不够时，跑一次性的训练任务</td>
      <td><a href="https://huggingface.co/docs/hub/jobs" target="_blank" rel="noopener">docs/hub/jobs</a></td>
    </tr>
    <tr>
      <td>Spaces</td>
      <td>托管的 demo 应用（Gradio / Streamlit / Docker）</td>
      <td>把量化后的模型做成可交互 demo 写进申请材料</td>
      <td><a href="https://huggingface.co/docs/hub/spaces" target="_blank" rel="noopener">docs/hub/spaces</a></td>
    </tr>
    <tr>
      <td><code>tiktoken</code></td>
      <td>OpenAI 的 BPE 分词器（r50k / cl100k / o200k）</td>
      <td>做分词对比实验、给 JAX 教程准备数据（E2、E6）</td>
      <td><a href="https://github.com/openai/tiktoken" target="_blank" rel="noopener">github/tiktoken</a></td>
    </tr>
  </tbody>
</table>

<h3>4. TRL 文档逐页清单</h3>
<p>
  下面这一节是全附录<strong>最值得收藏</strong>的部分。TRL 的版本迭代很快，API 与文档强绑定，
  所以「读哪一页」比「读多少」重要得多。所有链接都指向前缀
  <code>https://huggingface.co/docs/trl/</code> 下的页面。
</p>

<h4>4.1 Getting started（先跑通）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>什么时候读</th></tr></thead>
  <tbody>
    <tr><td>TRL 总览</td><td><a href="https://huggingface.co/docs/trl/index" target="_blank" rel="noopener">/docs/trl/index</a></td><td>先看左侧目录，建立「有哪些 Trainer」的整体概念</td></tr>
    <tr><td>Installation</td><td><a href="https://huggingface.co/docs/trl/installation" target="_blank" rel="noopener">/docs/trl/installation</a></td><td>第一次装、或版本冲突时。注意它对 transformers / peft 版本的连带要求</td></tr>
    <tr><td>Quickstart</td><td><a href="https://huggingface.co/docs/trl/quickstart" target="_blank" rel="noopener">/docs/trl/quickstart</a></td><td><strong>第一站</strong>。跑通一个最小 SFT 例子再往下读</td></tr>
  </tbody>
</table>

<h4>4.2 Conceptual Guides（建立心智模型）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>什么时候读</th></tr></thead>
  <tbody>
    <tr><td>Chat Templates</td><td><a href="https://huggingface.co/docs/trl/chat_templates" target="_blank" rel="noopener">/docs/trl/chat_templates</a></td><td>当你的模型输出格式奇怪、或数据是对话格式时。这是最常见的困惑来源</td></tr>
    <tr><td>Dataset Formats</td><td><a href="https://huggingface.co/docs/trl/dataset_formats" target="_blank" rel="noopener">/docs/trl/dataset_formats</a></td><td>准备数据之前<strong>必读</strong>。SFT / DPO / GRPO 各自要求的字段名完全不同</td></tr>
    <tr><td>Paper Index</td><td><a href="https://huggingface.co/docs/trl/paper_index" target="_blank" rel="noopener">/docs/trl/paper_index</a></td><td>想读原始论文时。按方法列好了 DPO / GRPO / KTO / RLOO 的出处</td></tr>
  </tbody>
</table>

<h4>4.3 Trainers（按需查阅，不要通读）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>什么时候读</th></tr></thead>
  <tbody>
    <tr><td>SFT Trainer</td><td><a href="https://huggingface.co/docs/trl/sft_trainer" target="_blank" rel="noopener">/docs/trl/sft_trainer</a></td><td>实验 E4。重点看数据格式、<code>completion_only_loss</code>、packing 相关参数</td></tr>
    <tr><td>DPO Trainer</td><td><a href="https://huggingface.co/docs/trl/dpo_trainer" target="_blank" rel="noopener">/docs/trl/dpo_trainer</a></td><td>实验 E5。重点看 <code>beta</code>、参考模型的提供方式、隐含奖励的日志字段</td></tr>
    <tr><td>GRPO Trainer</td><td><a href="https://huggingface.co/docs/trl/grpo_trainer" target="_blank" rel="noopener">/docs/trl/grpo_trainer</a></td><td>做可验证奖励（数学 / 代码）的强化学习时；它是当前最常用的在线 RL 方法</td></tr>
    <tr><td>KTO Trainer</td><td><a href="https://huggingface.co/docs/trl/kto_trainer" target="_blank" rel="noopener">/docs/trl/kto_trainer</a></td><td>你只有「好 / 坏」的二元标签、凑不出偏好对时</td></tr>
    <tr><td>Reward Trainer</td><td><a href="https://huggingface.co/docs/trl/reward_trainer" target="_blank" rel="noopener">/docs/trl/reward_trainer</a></td><td>要做经典 RLHF：先训一个奖励模型，再优化策略</td></tr>
    <tr><td>RLOO Trainer</td><td><a href="https://huggingface.co/docs/trl/rloo_trainer" target="_blank" rel="noopener">/docs/trl/rloo_trainer</a></td><td>想要比 PPO 更轻的在线 RL 基线时（REINFORCE 留一法）</td></tr>
    <tr><td>Distillation Trainer</td><td><a href="https://huggingface.co/docs/trl/distillation_trainer" target="_blank" rel="noopener">/docs/trl/distillation_trainer</a></td><td>把大模型的能力蒸馏到小模型时</td></tr>
  </tbody>
</table>

<h4>4.4 How-to Guides（遇到具体工程问题时）</h4>
<table class="tbl small">
  <thead><tr><th>页面</th><th>链接</th><th>解决什么问题</th></tr></thead>
  <tbody>
    <tr><td>CLI</td><td><a href="https://huggingface.co/docs/trl/clis" target="_blank" rel="noopener">/docs/trl/clis</a></td><td>不想写 Python，直接用命令行启动一次训练</td></tr>
    <tr><td>Training using Jobs</td><td><a href="https://huggingface.co/docs/trl/jobs_training" target="_blank" rel="noopener">/docs/trl/jobs_training</a></td><td>要把训练提交到 HF Jobs 上跑</td></tr>
    <tr><td>Customizing the Training</td><td><a href="https://huggingface.co/docs/trl/customization" target="_blank" rel="noopener">/docs/trl/customization</a></td><td>需要自定义损失、回调、或改写训练循环</td></tr>
    <tr><td>Reducing Memory Usage</td><td><a href="https://huggingface.co/docs/trl/reducing_memory_usage" target="_blank" rel="noopener">/docs/trl/reducing_memory_usage</a></td><td><strong>OOM 时的第一站</strong>：梯度检查点、4-bit、Liger、序列打包</td></tr>
    <tr><td>Speeding Up Training</td><td><a href="https://huggingface.co/docs/trl/speeding_up_training" target="_blank" rel="noopener">/docs/trl/speeding_up_training</a></td><td>能跑但太慢：FlashAttention、序列打包、批大小</td></tr>
    <tr><td>Distributing Training</td><td><a href="https://huggingface.co/docs/trl/distributing_training" target="_blank" rel="noopener">/docs/trl/distributing_training</a></td><td>要上多卡 / 多机</td></tr>
    <tr><td>Training Beyond 1M Tokens</td><td><a href="https://huggingface.co/docs/trl/long_context_training" target="_blank" rel="noopener">/docs/trl/long_context_training</a></td><td>上下文拉到很长时（长文档、长对话）</td></tr>
    <tr><td>Using Trained Models</td><td><a href="https://huggingface.co/docs/trl/use_model" target="_blank" rel="noopener">/docs/trl/use_model</a></td><td><strong>训练完之后的必读</strong>：怎么正确加载你自己产出的模型</td></tr>
  </tbody>
</table>

<h4>4.5 Integrations（与其它库的接口）</h4>
<table class="tbl small">
  <thead><tr><th>集成</th><th>链接</th><th>为什么值得看</th></tr></thead>
  <tbody>
    <tr><td>PEFT</td><td><a href="https://huggingface.co/docs/trl/peft_integration" target="_blank" rel="noopener">/docs/trl/peft_integration</a></td><td>实验 E4 / E5 的全部细节：LoRA 配置、参考模型怎么省、adapter 怎么合并</td></tr>
    <tr><td>vLLM</td><td><a href="https://huggingface.co/docs/trl/vllm_integration" target="_blank" rel="noopener">/docs/trl/vllm_integration</a></td><td>用 vLLM 加速生成式训练（GRPO 采样阶段的关键优化）</td></tr>
    <tr><td>Unsloth</td><td><a href="https://huggingface.co/docs/trl/unsloth_integration" target="_blank" rel="noopener">/docs/trl/unsloth_integration</a></td><td>单卡上把微调速度和显存都优化一档</td></tr>
    <tr><td>Liger Kernel</td><td><a href="https://huggingface.co/docs/trl/liger_kernel_integration" target="_blank" rel="noopener">/docs/trl/liger_kernel_integration</a></td><td>通过融合算子降低显存占用，一行开关</td></tr>
    <tr><td>DeepSpeed</td><td><a href="https://huggingface.co/docs/trl/deepspeed_integration" target="_blank" rel="noopener">/docs/trl/deepspeed_integration</a></td><td>ZeRO 分片：多卡训练的显存分摊</td></tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">!</span>关于链接形式的一个实测细节</h4>
  <p>
    Integrations 的五个页面，官方 URL 是<strong>带 <code>_integration</code> 后缀</strong>的形式
    （<code>/docs/trl/peft_integration</code> 等）。短形式（例如 <code>/docs/trl/peft</code>）目前只在
    <code>main</code> 版本下存在，指向稳定版时会提示「该页面在此版本不存在」。
    如果你从旧教程里抄到了短链接并发现 404，把 <code>_integration</code> 补上即可。
  </p>
  <p>
    同理，TRL 的 <code>how-to</code> 页面从早期版本起改过名字，遇到失效链接时，
    <strong>永远从 <a href="https://huggingface.co/docs/trl/index" target="_blank" rel="noopener">/docs/trl/index</a>
    的左侧目录进入</strong>，而不是相信任何二手链接。
  </p>
</section>

<h3>5. 表 2 · 学习路径与实验映射</h3>
<p>
  下面这张表按「先读哪几节」而不是「读哪个资源」来组织。原因是读者的时间精力永远有限：
  全景文献旨在打通学术脉络，而具体动手则必须精准匹配实验产出。
</p>
<table class="tbl small">
  <thead><tr><th>资源</th><th>链接</th><th>先读哪几节</th><th>配哪个实验</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Hugging Face Learn</strong>（总入口）</td>
      <td><a href="https://huggingface.co/learn" target="_blank" rel="noopener">huggingface.co/learn</a></td>
      <td>先在这里确认课程清单与各自的语言版本，再决定要不要投入某一门</td>
      <td>—</td>
    </tr>
    <tr>
      <td><strong>LLM Course</strong></td>
      <td><a href="https://huggingface.co/learn/llm-course/chapter1/1" target="_blank" rel="noopener">learn/llm-course</a></td>
      <td>第 1 章第 1–6 节（Transformer 与 LLM 基础）→ 第 6 章（Tokenizers 库）→ 第 5 章（Datasets 库）
        → 第 11 章（微调大模型）→ 第 12 章（推理模型）。第 7–10 章按需查</td>
      <td>E1、E2、E4</td>
    </tr>
    <tr>
      <td><strong>Agents Course</strong></td>
      <td><a href="https://huggingface.co/learn/agents-course/unit0/introduction" target="_blank" rel="noopener">learn/agents-course</a></td>
      <td>Unit 1（Agent Fundamentals：工具、消息格式、特殊 token、chat template）→ Unit 2.1（smolagents）
        → Bonus Unit 1（为函数调用微调模型）。Unit 3、4 只在你要做 agent 项目时读</td>
      <td>E4（chat template 的实战背景）</td>
    </tr>
    <tr>
      <td><strong>JAX AI Stack</strong>（总入口）</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/" target="_blank" rel="noopener">docs.jaxstack.ai</a></td>
      <td>先看 Tutorials 列表与「JAX AI Stack 由哪些库组成」（JAX / Flax / Orbax / Optax / Grain / ml_dtypes）</td>
      <td>E6</td>
    </tr>
    <tr>
      <td><strong>《Train a miniGPT language model with JAX》</strong></td>
      <td><a href="https://docs.jaxstack.ai/en/latest/JAX_for_LLM_pretraining.html" target="_blank" rel="noopener">JAX_for_LLM_pretraining.html</a></td>
      <td>按节读：Setup（用 <code>jax-ai-stack[grain]</code> 聚合安装）→ 用 Flax 定义 miniGPT
        → <code>jax.sharding.Mesh</code> → 数据加载与预处理 → 损失与训练步 → 保存检查点。
        三个关键词必须弄懂：<span class="t" data-tterm="Mesh" data-d="一个由设备组成的多维数组，每条轴有名字（如 batch / model）。它描述「有哪些算力、怎么排列」。">Mesh</span>、
        <span class="t" data-tterm="PartitionSpec" data-d="描述某个张量的每一维如何分布到 mesh 的各条轴上；None 表示该维不切分（复制）。">PartitionSpec</span>、
        <span class="t" data-tterm="NamedSharding" data-d="(Mesh, PartitionSpec) 的组合，告诉编译器某个具体张量该怎么切。">NamedSharding</span>
      </td>
      <td>E6</td>
    </tr>
    <tr>
      <td>《JAX for PyTorch users》</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/JAX_for_PyTorch_users.html" target="_blank" rel="noopener">JAX_for_PyTorch_users.html</a></td>
      <td>整篇。它是你在附录 B 里填「PyTorch / JAX 对照表」时的官方依据</td>
      <td>E6</td>
    </tr>
    <tr>
      <td>《Porting a PyTorch model to JAX》</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/JAX_porting_PyTorch_model.html" target="_blank" rel="noopener">JAX_porting_PyTorch_model.html</a></td>
      <td>整篇。把 E3 的 PyTorch 实现逐层搬过去时对照着看</td>
      <td>E6</td>
    </tr>
    <tr>
      <td>《Introduction to Data Loaders》</td>
      <td><a href="https://docs.jaxstack.ai/en/latest/data_loaders.html" target="_blank" rel="noopener">data_loaders.html</a></td>
      <td>只看 Grain 部分（另有 CPU / GPU 两篇子页）。目的：搞清 <code>DataSource</code> 与 <code>Sampler</code> 的分工</td>
      <td>E6</td>
    </tr>
    <tr>
      <td><strong>Google Colab 入门 notebook</strong></td>
      <td><a href="https://colab.research.google.com/notebooks/intro.ipynb" target="_blank" rel="noopener">notebooks/intro.ipynb</a></td>
      <td>只要两节：运行时类型怎么切换、文件与磁盘怎么持久化（<code>/content</code> 会随会话消失）</td>
      <td>全部实验</td>
    </tr>
    <tr>
      <td>直接在 Colab 打开 miniGPT 教程</td>
      <td><a href="https://colab.research.google.com/github/jax-ml/jax-ai-stack/blob/main/docs/source/JAX_for_LLM_pretraining.ipynb" target="_blank" rel="noopener">Colab 上的 JAX_for_LLM_pretraining.ipynb</a></td>
      <td>从教程页的「Run in Google Colab」按钮进入；这也是验证「我本地版本与官方是否一致」的最快方式</td>
      <td>E6</td>
    </tr>
    <tr>
      <td>Kaggle（TPU v5e-8）</td>
      <td><a href="https://www.kaggle.com/" target="_blank" rel="noopener">kaggle.com</a></td>
      <td>当你确实想跑 <code>(4, 2)</code> 的 mesh 时来这里；免费层 Colab 只有单核 TPU，做不到 SPMD</td>
      <td>E6 延伸</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-q">
  <h4><span class="ic">◆</span>关于 TPU 的一句话真相（值得单独记住）</h4>
  <p>
    JAX AI Stack 的 miniGPT 教程面向 <strong>TPU v5e-8</strong>（Kaggle 免费层提供）写成，
    使用 4 路数据并行 + 2 路张量并行。但教程同时写明：<strong>截至 2025 年 10 月，
    Colab 免费层只提供 TPU v5e-1，已经无法支持 SPMD</strong>。
  </p>
  <p>
    这解释了一个非常常见的失败场景：你照着官方教程抄了 <code>(4, 2)</code> 的 mesh，
    在 Colab 上直接报错。正确做法不是放弃，而是把 mesh 改成 <code>(1, 1)</code>——
    模型代码一行都不用改，只是失去了并行加速。附录 B 的 E6 就是按这个思路改写的。
  </p>
</section>

<h3>6. 表 3 · 12 周高强度研读节奏</h3>
<p>
  这张表把模块、核心文献与实验绑在一起。每周的产出必须是<strong>可放进申请材料的东西</strong>，
  而不是「读完了某几页」。每周建议投入 6–8 小时。
</p>
<table class="tbl small">
  <thead><tr><th>周</th><th>读什么（文献与教程）</th><th>配哪个实验</th><th>本周产出</th></tr></thead>
  <tbody>
    <tr><td><strong>1</strong></td><td>模块 00–01；#001 Strang 线代、#011 Cover & Thomas 信息论；LLM Course 第 1 章</td><td><strong>E1</strong></td><td>bigram → 神经 bigram → MLP 的三条 perplexity 曲线与记录表</td></tr>
    <tr><td><strong>2</strong></td><td>模块 02；#005 Eckart-Young SVD、#151 Karpathy minbpe；LLM Course 第 6 章（Tokenizers）</td><td><strong>E2</strong></td><td>「生育率」在四个 tokenizer 下的切分对照表与成本换算</td></tr>
    <tr><td><strong>3</strong></td><td>模块 03–04；#041 Vaswani Attention 原论文、#057 Su RoPE；LLM Course 第 1 章</td><td><strong>E3</strong>（上半）</td><td>可运行的迷你 Transformer，能在 TinyStories 上收敛</td></tr>
    <tr><td><strong>4</strong></td><td>模块 04–05；#081 Kaplan 与 #082 Chinchilla 标度律；JAX AI Stack「JAX for PyTorch users」</td><td><strong>E3</strong>（下半）</td><td>参数量手算与程序统计完全相等；FLOPs 与 MFU 估算</td></tr>
    <tr><td><strong>5</strong></td><td>模块 06；#125 Megatron-LM 张量并行、#129 GSPMD；JAX miniGPT 教程</td><td><strong>E6</strong></td><td>单设备 JAX miniGPT + PyTorch / JAX 逐项对照表</td></tr>
    <tr><td><strong>6</strong></td><td>模块 07（SFT 部分）；#145 QLoRA 论文；TRL Quickstart、SFT Trainer、PEFT 集成</td><td><strong>E4</strong></td><td>LoRA adapter + 可训练参数占比 + 基座对照输出</td></tr>
    <tr><td><strong>7</strong></td><td>模块 07（对齐部分）；#101 DPO 论文、#102 GRPO 论文；TRL DPO Trainer</td><td><strong>E5</strong></td><td>偏好对数据集 + margin 曲线 + β 扫描结论</td></tr>
    <tr><td><strong>8</strong></td><td>模块 09 上半；#028 Wainwright 高维统计、#037 Francis Bach 学习理论；LLM Course 第 11 章</td><td><strong>E7</strong>（第一遍）</td><td>分组交叉验证的模型阶梯表 + 置换检验 p 值</td></tr>
    <tr><td><strong>9</strong></td><td>模块 09 下半；#038 Gretton MMD 双样本检验；复习分层抽样与多重比较</td><td><strong>E7</strong>（第二遍）</td><td>加入噪声特征后的选择偏差实验；结论模板定稿</td></tr>
    <tr><td><strong>10</strong></td><td>模块 08、10；#130 FlashAttention、#134 vLLM PagedAttention；bitsandbytes 文档</td><td><strong>E8</strong></td><td>量化显存/速度对照表 + 并发-吞吐-延迟曲线</td></tr>
    <tr><td><strong>11</strong></td><td>模块 11–13；#121 Hennessy & Patterson 体系结构；TRL Jobs 页（若要上云）</td><td>—（整理 E1–E8 的记录）</td><td>算力预算表与订阅等效额度换算</td></tr>
    <tr><td><strong>12</strong></td><td>模块 14–16；附录 A 术语表全过一遍；#012 MacKay 推断与学习算法</td><td>—（复现一次 E7 与 E8）</td><td>研究报告 + 口头答辩稿；所有实验可一键复现</td></tr>
  </tbody>
</table>
<p>
  <strong>两周的弹性空间</strong>：如果你在第 5 周发现 JAX 版占用了太多时间，
  就把第 9 周的 E7 第二遍删掉，把第 12 周的复现改成只复现 E7。
  <strong>唯一不能删的是 E7</strong>——它直接对应你申请项目里的 Checkpoint 7。
</p>

<h3>7. 怎么用公开访谈与视频类资料</h3>
<p>
  视频与访谈不是「不可信」，而是<strong>可信的维度不同</strong>。它们最有价值的成分是
  <em>工程经验</em>与<em>量级直觉</em>；最容易过期的成分是<em>具体数字</em>与<em>界面位置</em>。
  把这两类内容分开对待，你就能既吸收经验又不被误导。
</p>
<table class="tbl small">
  <thead><tr><th>内容类型</th><th>可信度</th><th>为什么</th><th>怎么用</th></tr></thead>
  <tbody>
    <tr>
      <td>可复现的工程经验（「我这样配就能在 16GB 上训 7B」）</td>
      <td><strong>高</strong></td>
      <td>它有明确的成功判据，而且你能在半小时内验证</td>
      <td>抄配置，自己跑一遍，把结果记进实验台账</td>
    </tr>
    <tr>
      <td>量级估算（「4-bit 的 7B 大约 4GB 权重」）</td>
      <td><strong>高</strong></td>
      <td>它由位宽与参数量决定，物理上很难说错</td>
      <td>当作心算校验：与你的公式估算对照</td>
    </tr>
    <tr>
      <td>失败教训与坑（「pad token 没设会炸」）</td>
      <td><strong>高</strong></td>
      <td>错误现象可复现，且往往比文档更贴近真实报错</td>
      <td>整理成自己的排错清单（附录 B 每节的「常见错误」就是这类内容）</td>
    </tr>
    <tr>
      <td>架构与直觉解释（「注意力像检索」）</td>
      <td><strong>中</strong></td>
      <td>类比帮助入门，但会掩盖边界条件</td>
      <td>当作入口，随后必须用公式与代码校准</td>
    </tr>
    <tr>
      <td>精确价格、费率、额度倍率</td>
      <td><strong>低</strong></td>
      <td>价格与配额每月都可能变，视频的时间戳不会跟着变</td>
      <td>只取「量级」（几十倍、几美元级），具体数字查官方定价页</td>
    </tr>
    <tr>
      <td>平台政策与条款解读</td>
      <td><strong>低</strong></td>
      <td>说的人常常没有读过原文，或读的是旧版本</td>
      <td>去读 ToS / Usage Policy 原文；把「能不能用于生产流量」这类判断交给条款</td>
    </tr>
    <tr>
      <td>界面操作步骤（「点右上角第三个按钮」）</td>
      <td><strong>低</strong></td>
      <td>UI 改版后步骤立即失效，而视频不会更新</td>
      <td>用它建立「大概在哪」，真正操作时以当前界面为准</td>
    </tr>
    <tr>
      <td>排行榜与「某模型能推理 / 能自主」这类断言</td>
      <td><strong>低</strong></td>
      <td>存在数据污染、选择性汇报与营销动机</td>
      <td>要结论就自己做一个最小评估（模块 09 的方法论）</td>
    </tr>
    <tr>
      <td>访谈里的商业判断与个人选择</td>
      <td><strong>看情况</strong></td>
      <td>讲述者有激励结构（卖课、卖工具、卖观点），且存在幸存者偏差</td>
      <td>问三个问题：他的目标函数是什么？样本量是多少？反例在哪里？</td>
    </tr>
  </tbody>
</table>

<section class="blk blk-warn">
  <h4><span class="ic">!</span>三步核实法（30 分钟以内）</h4>
  <ol>
    <li><strong>找官方文档</strong>：库的参数查库文档，平台的行为查平台文档，法规查条款原文。
        只接受<strong>能给出链接</strong>的说法——包括你自己再笔记里写下的说法。</li>
    <li><strong>看条款与定价页</strong>：任何涉及钱、额度、以及「能不能这样用」的结论，
        都要落到 ToS、Usage Policy 或 Pricing 页面上。<strong>顺手记下查询日期</strong>，
        因为这是唯一能让半年后的你知道「当时是这么写的」的方法。</li>
    <li><strong>自己跑一遍</strong>：写 20 行最小复现。
        「Colab 免费层有没有 8 核 TPU」这个问题，<code>jax.devices()</code> 一行就能回答；
        「4-bit 到底省多少显存」，<code>torch.cuda.max_memory_allocated()</code> 一行就能回答。
        <strong>能一行验证的事，不要花两小时看视频。</strong></li>
  </ol>
</section>

<section class="blk blk-tip">
  <h4><span class="ic">✓</span>建立你自己的科研信源台账</h4>
  <p>在仓库里维护一个 <code>notes/resources.md</code>，每一条记录至少包含四个字段：</p>
  <table class="tbl small">
    <thead><tr><th>字段</th><th>为什么必须有</th><th>示例</th></tr></thead>
    <tbody>
      <tr><td>链接</td><td>二手记忆不可靠，链接可回溯</td><td>TRL dpo_trainer 页</td></tr>
      <tr><td>访问日期</td><td>文档会变，日期是唯一的时间锚点</td><td>2026-10-03</td></tr>
      <tr><td>一句话结论</td><td>你半年后只会读这一句</td><td>beta 默认 0.1，越小越激进</td></tr>
      <tr><td>验证状态</td><td>区分「文档说」与「我跑过」</td><td>已用 E5 验证</td></tr>
    </tbody>
  </table>
  <p>
    这份台账的价值会随时间单调上升：它把你从「又一次搜索同一件事」中永久解放出来，
    同时它本身就是「我如何管理信息」的能力证明。
  </p>
</section>

<div class="quiz">
  <div class="qlabel">自测 · 1</div>
  <p class="q">你要确认 TRL 里 DPO 的 <code>beta</code> 参数的默认值与确切语义。最该先查哪里？</p>
  <ul class="opts">
    <li>在视频平台上搜「DPO beta 怎么调」，看播放量最高的那一个</li>
    <li>在聊天窗口里问一句「DPO 的 beta 默认是多少」</li>
    <li data-ok>TRL 文档的 DPO Trainer 页（必要时对照 Paper Index 里的 DPO 原论文），再用 <code>pip show trl</code> 锁定版本</li>
    <li>Hub 上随便找一个 DPO 模型的 README</li>
  </ul>
  <p class="why">
    参数默认值属于<strong>版本化的事实</strong>，唯一权威是文档，而且必须与你的实际版本对齐——
    这正是先跑 <code>pip show trl</code> 的原因。视频与 README 都可能过期；
    聊天助手的答案无法给出可验证的版本边界（它可能把不同版本的默认值混在一起）。
    想再稳一层：在 notebook 里 <code>print(DPOConfig().beta)</code>，一行拿到真相。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 2</div>
  <p class="q">一个视频说「Colab 免费层的 TPU 已经是 8 核，照官方教程把 mesh 写成 (4, 2) 就行」。最稳妥的做法是什么？</p>
  <ul class="opts">
    <li>照做，因为官方教程就是这么写的</li>
    <li data-ok>先跑 <code>jax.devices()</code> 看实际设备数；官方教程本身写明免费层只有单核 TPU v5e-1、无法支持 SPMD，因此应把 mesh 改成 (1, 1)，想去 8 核就用 Kaggle 的 TPU v5e-8</li>
    <li>直接放弃 JAX，改用 PyTorch</li>
    <li>把 <code>(4, 2)</code> 改成 <code>(2, 4)</code> 试试</li>
  </ul>
  <p class="why">
    这是一个<strong>一行代码就能验证</strong>的问题：<code>jax.devices()</code> 的输出是唯一事实。
    同时注意，官方教程已经主动写了这个限制（「as of October 2025, free-tier Colab only offers TPU v5e-1, which can no longer support SPMD」）——所以正确的信息其实一直都在文档里，
    视频只是把它压缩成了一句话并抹掉了日期。改变轴顺序 <code>(2, 4)</code> 不会创造第二个设备。
  </p>
</div>

<div class="quiz">
  <div class="qlabel">自测 · 3</div>
  <p class="q">你想知道「在 Hugging Face Jobs 上跑一次多卡训练该怎么配、大致什么价位」。该去哪一组页面查？</p>
  <ul class="opts">
    <li>TRL 的 SFT Trainer 页 + LLM Course 第 11 章</li>
    <li>某个访谈里提到的报价 + 论坛帖子的经验</li>
    <li data-ok>Hub 文档的 Jobs 页（配置与硬件选项）+ 官方定价页（价格口径），并记下查询日期</li>
    <li>vLLM 文档 + bitsandbytes 文档</li>
  </ul>
  <p class="why">
    这里有两个相互独立的事实来源：<strong>功能怎么用</strong>在 Hub 的 Jobs 文档，
    <strong>要花多少钱</strong>在定价页。任何「价格」类结论都必须带日期，因为它是最容易过期的信息。
    TRL 的 SFT Trainer 页讲的是训练器的参数与数据格式，不涉及平台计费；
    vLLM 与 bitsandbytes 分别管推理引擎与量化，与 Jobs 的配置无关。
    记住这条分工：<em>库的功能查库文档，平台的行为与价格查平台文档，条款查 ToS 原文。</em>
  </p>
</div>
`
});
