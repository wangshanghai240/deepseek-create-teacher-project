// 认证相关路由（登录、注册）
const express = require('express');
const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');

// 数据库连接配置
const dbPoolConfig = {
  host: 'mysql.sqlpub.com',
  port: 3306,
  user: 'wangshanghai',
  password: 'TZw5UYxoPEhwNAM3',
  database: 'wang_tom'
};

// JWT token 生成函数（简单模拟）
function generateToken(user) {
  return `token_${user.id}_${Date.now()}`;
}

const router = express.Router();

/**
 * @route   POST /api/register
 * @desc    用户注册 - 数据同步到 teacher_list 表
 */
router.post('/register', async (req, res) => {
  let pool;
  try {
    const { teacher_name, password, phone, email } = req.body;

    // 验证输入参数
    if (!teacher_name || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    pool = mysql.createPool(dbPoolConfig);

    // 检查用户是否已存在
    const [existingUsers] = await pool.execute(
      'SELECT id FROM teacher_list WHERE teacher_name = ?',
      [teacher_name]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: '该用户名已被注册' 
      });
    }

    // 密码加密
    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(password, saltRounds);

    // 插入用户
    const [result] = await pool.execute(
      `INSERT INTO teacher_list (teacher_name, password, phone, email, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [teacher_name, hashedPassword, phone || null, email || null]
    );

    console.log(`✓ 新用户注册成功，ID: ${result.insertId}`);

    res.status(201).json({ 
      success: true, 
      message: '注册成功',
      userId: result.insertId
    });

  } catch (error) {
    console.error('注册错误:', error.message);
    res.status(500).json({ 
      success: false, 
      message: '注册失败：' + error.message 
    });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   POST /api/login
 * @desc    用户登录 - 验证 teacher_name + password 并比对 MySQL
 */
router.post('/login', async (req, res) => {
  let pool;
  try {
    const { username, password } = req.body;

    // 验证输入参数
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    pool = mysql.createPool(dbPoolConfig);

    // 查询用户（数据库字段：teacher_name 对应用户名）
    const [users] = await pool.execute(
      `SELECT id, teacher_name, password FROM teacher_list WHERE teacher_name = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误'
      });
    }

    const user = users[0];

    // 验证密码
    const isValidPassword = await bcryptjs.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }

    // 登录成功
    const token = generateToken(user);

    console.log(`✓ 用户 ${username} 登录成功`);

    res.json({ 
      success: true, 
      message: '登录成功',
      data: {
        id: user.id,
        username: user.teacher_name
      },
      token
    });

  } catch (error) {
    console.error('登录错误:', error.message);
    res.status(500).json({ 
      success: false, 
      message: '登录失败：' + error.message 
    });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   GET /api/teachers
 * @desc    获取教师列表
 */
router.get('/teachers', async (req, res) => {
  let pool;
  try {
    pool = mysql.createPool(dbPoolConfig);

    const [rows] = await pool.execute(
      'SELECT id, teacher_name, age, course, phone, email, created_at FROM teacher_list ORDER BY id ASC'
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('获取教师列表错误:', error.message);
    res.status(500).json({
      success: false,
      message: '获取教师列表失败：' + error.message
    });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   PUT /api/teachers/:id
 * @desc    编辑教师信息（用户名、年龄、课程、手机号、邮箱）
 */
router.put('/teachers/:id', async (req, res) => {
  let pool;
  try {
    const { id } = req.params;
    const { teacher_name, age, course, phone, email } = req.body;

    pool = mysql.createPool(dbPoolConfig);

    // 如果要修改用户名，检查是否已被占用
    if (teacher_name) {
      const [existing] = await pool.execute(
        'SELECT id FROM teacher_list WHERE teacher_name = ? AND id != ?',
        [teacher_name, id]
      );
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: '该用户名已被使用'
        });
      }
    }

    await pool.execute(
      'UPDATE teacher_list SET teacher_name = COALESCE(?, teacher_name), age = ?, course = ?, phone = ?, email = ? WHERE id = ?',
      [teacher_name || null, age ?? null, course ?? null, phone ?? null, email ?? null, id]
    );

    const [rows] = await pool.execute(
      'SELECT id, teacher_name, age, course, phone, email, created_at FROM teacher_list WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '更新成功',
      data: rows[0]
    });
  } catch (error) {
    console.error('更新教师错误:', error.message);
    res.status(500).json({
      success: false,
      message: '更新失败：' + error.message
    });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   PUT /api/teachers/:id/password
 * @desc    修改密码（需验证旧密码）
 */
router.put('/teachers/:id/password', async (req, res) => {
  let pool;
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '密码不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要 6 位'
      });
    }

    pool = mysql.createPool(dbPoolConfig);

    // 查询当前密码
    const [users] = await pool.execute(
      'SELECT password FROM teacher_list WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];

    // 验证旧密码
    const isValid = await bcryptjs.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 加密新密码并更新
    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(newPassword, saltRounds);

    await pool.execute(
      'UPDATE teacher_list SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error.message);
    res.status(500).json({
      success: false,
      message: '修改密码失败：' + error.message
    });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   POST /api/check-username
 * @desc    检查用户名是否已存在
 */
router.post('/check-username', async (req, res) => {
  let pool;
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: '用户名不能为空' });
    }
    pool = mysql.createPool(dbPoolConfig);
    const [rows] = await pool.execute(
      'SELECT id FROM teacher_list WHERE teacher_name = ?',
      [username]
    );
    res.json({ success: true, exists: rows.length > 0 });
  } catch (error) {
    console.error('检查用户名错误:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   POST /api/admin/login
 * @desc    管理员登录
 */
router.post('/admin/login', async (req, res) => {
  let pool;
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    pool = mysql.createPool(dbPoolConfig);

    const [users] = await pool.execute(
      'SELECT id, username, age, phone, email FROM admin_list WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '管理员账号或密码错误'
      });
    }

    const [passwords] = await pool.execute(
      'SELECT password FROM admin_list WHERE username = ?',
      [username]
    );

    const isValid = await bcryptjs.compare(password, passwords[0].password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '管理员账号或密码错误'
      });
    }

    const admin = users[0];
    const token = generateToken(admin);

    console.log(`✓ 管理员 ${username} 登录成功`);

    res.json({
      success: true,
      message: '管理员登录成功',
      data: {
        id: admin.id,
        username: admin.username,
        isAdmin: true
      },
      token
    });
  } catch (error) {
    console.error('管理员登录错误:', error.message);
    res.status(500).json({
      success: false,
      message: '管理员登录失败：' + error.message
    });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   GET /api/admin/profile
 * @desc    获取管理员详细信息
 */
router.get('/admin/profile', async (req, res) => {
  let pool;
  try {
    const adminId = req.query.id;
    if (!adminId) {
      return res.status(400).json({ success: false, message: '缺少管理员ID' });
    }

    pool = mysql.createPool(dbPoolConfig);

    const [rows] = await pool.execute(
      'SELECT id, username, age, phone, email FROM admin_list WHERE id = ?',
      [adminId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('获取管理员信息错误:', error.message);
    res.status(500).json({ success: false, message: '获取管理员信息失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   PUT /api/admin/profile
 * @desc    更新管理员信息（用户名、年龄、手机号、邮箱）
 */
router.put('/admin/profile', async (req, res) => {
  let pool;
  try {
    const { id, username, age, phone, email } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: '缺少管理员ID' });
    }

    pool = mysql.createPool(dbPoolConfig);

    // 如果要修改用户名，检查是否已被占用
    if (username) {
      const [existing] = await pool.execute(
        'SELECT id FROM admin_list WHERE username = ? AND id != ?',
        [username, id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: '该用户名已被使用' });
      }
    }

    await pool.execute(
      'UPDATE admin_list SET username = COALESCE(?, username), age = ?, phone = ?, email = ? WHERE id = ?',
      [username || null, age ?? null, phone ?? null, email ?? null, id]
    );

    const [rows] = await pool.execute(
      'SELECT id, username, age, phone, email FROM admin_list WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: '更新成功', data: rows[0] });
  } catch (error) {
    console.error('更新管理员信息错误:', error.message);
    res.status(500).json({ success: false, message: '更新失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   PUT /api/admin/password
 * @desc    管理员修改密码
 */
router.put('/admin/password', async (req, res) => {
  let pool;
  try {
    const { id, oldPassword, newPassword } = req.body;

    if (!id || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码至少需要 6 位' });
    }

    pool = mysql.createPool(dbPoolConfig);

    const [users] = await pool.execute(
      'SELECT password FROM admin_list WHERE id = ?',
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    const isValid = await bcryptjs.compare(oldPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '当前密码错误' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    await pool.execute('UPDATE admin_list SET password = ? WHERE id = ?', [hashedPassword, id]);

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改管理员密码错误:', error.message);
    res.status(500).json({ success: false, message: '修改密码失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   POST /api/user/auth
 * @desc    提交实名认证信息
 */
router.post('/user/auth', async (req, res) => {
  let pool;
  try {
    const { userId, realName, idCard, idCardFront, idCardBack } = req.body;

    if (!userId || !realName || !idCard) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    pool = mysql.createPool(dbPoolConfig);

    // 检查是否已有认证记录
    const [existing] = await pool.execute(
      'SELECT id FROM user_auth WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // 更新已有记录
      await pool.execute(
        'UPDATE user_auth SET real_name = ?, id_card = ?, id_card_front = ?, id_card_back = ?, status = ? WHERE user_id = ?',
        [realName, idCard, idCardFront || null, idCardBack || null, 'pending', userId]
      );
    } else {
      // 插入新记录
      await pool.execute(
        'INSERT INTO user_auth (user_id, real_name, id_card, id_card_front, id_card_back, status) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, realName, idCard, idCardFront || null, idCardBack || null, 'pending']
      );
    }

    res.json({ success: true, message: '实名认证信息已提交，等待审核' });
  } catch (error) {
    console.error('提交认证错误:', error.message);
    res.status(500).json({ success: false, message: '提交认证失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   GET /api/user/auth/:userId
 * @desc    获取用户的实名认证信息
 */
router.get('/user/auth/:userId', async (req, res) => {
  let pool;
  try {
    const { userId } = req.params;

    pool = mysql.createPool(dbPoolConfig);

    const [rows] = await pool.execute(
      'SELECT id, user_id, real_name, id_card, id_card_front, id_card_back, status, created_at, updated_at FROM user_auth WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    const data = {
      realName: rows[0].real_name,
      idCard: rows[0].id_card,
      idCardFront: rows[0].id_card_front,
      idCardBack: rows[0].id_card_back,
      status: rows[0].status
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取认证信息错误:', error.message);
    res.status(500).json({ success: false, message: '获取认证信息失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

/**
 * @route   POST /api/user/change-password
 * @desc    用户修改密码
 */
router.post('/user/change-password', async (req, res) => {
  let pool;
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码至少需要 6 位' });
    }

    pool = mysql.createPool(dbPoolConfig);

    const [users] = await pool.execute(
      'SELECT password FROM teacher_list WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const isValid = await bcryptjs.compare(oldPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '当前密码错误' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    await pool.execute('UPDATE teacher_list SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error.message);
    res.status(500).json({ success: false, message: '修改密码失败：' + error.message });
  } finally {
    if (pool) await pool.end();
  }
});

module.exports = router;