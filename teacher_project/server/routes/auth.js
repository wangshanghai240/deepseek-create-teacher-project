// 认证相关路由（登录、注册）- 已迁移至 InsForge (REST API)
const express = require('express');
const bcryptjs = require('bcryptjs');
const insforge = require('../config/insforge');

// JWT token 生成函数（简单模拟）
function generateToken(user) {
  return `token_${user.id}_${Date.now()}`;
}

const router = express.Router();

/**
 * @route   POST /api/register
 * @desc    用户注册 - 使用 InsForge REST API
 */
router.post('/register', async (req, res) => {
  try {
    const { teacher_name, password, phone, email } = req.body;

    if (!teacher_name || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    // 检查用户是否已存在
    const { data: existingUsers, error: checkError } = await insforge.select('teacher_list', {
      select: 'id',
      eq: { column: 'teacher_name', value: teacher_name }
    });

    if (checkError) throw checkError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: '该用户名已被注册' 
      });
    }

    // 密码加密
    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(password, saltRounds);

    // 插入用户
    const { data: result, error: insertError } = await insforge.insert('teacher_list', {
      teacher_name,
      password: hashedPassword,
      phone: phone || null,
      email: email || null
    });

    if (insertError) throw insertError;

    const insertedId = result && result[0] ? result[0].id : null;
    console.log(`✓ 新用户注册成功，ID: ${insertedId}`);

    res.status(201).json({ 
      success: true, 
      message: '注册成功',
      userId: insertedId
    });

  } catch (error) {
    console.error('注册错误:', error.message);
    res.status(500).json({ 
      success: false, 
      message: '注册失败：' + error.message 
    });
  }
});

/**
 * @route   POST /api/login
 * @desc    用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    const { data: users, error: queryError } = await insforge.select('teacher_list', {
      select: 'id, teacher_name, password',
      eq: { column: 'teacher_name', value: username }
    });

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误'
      });
    }

    const user = users[0];
    const isValidPassword = await bcryptjs.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }

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
  }
});

/**
 * @route   GET /api/teachers
 * @desc    获取教师列表
 */
router.get('/teachers', async (req, res) => {
  try {
    const { data: rows, error } = await insforge.select('teacher_list', {
      select: 'id, teacher_name, age, course, phone, email, created_at',
      order: 'id.asc'
    });

    if (error) throw error;

    res.json({
      success: true,
      data: rows || []
    });
  } catch (error) {
    console.error('获取教师列表错误:', error.message);
    res.status(500).json({
      success: false,
      message: '获取教师列表失败：' + error.message
    });
  }
});

/**
 * @route   PUT /api/teachers/:id
 * @desc    编辑教师信息
 */
router.put('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacher_name, age, course, phone, email } = req.body;

    // 如果要修改用户名，检查是否已被占用
    if (teacher_name) {
      const { data: existing, error: checkError } = await insforge.select('teacher_list', {
        select: 'id',
        eq: { column: 'teacher_name', value: teacher_name },
        neq: { column: 'id', value: id }
      });

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: '该用户名已被使用'
        });
      }
    }

    const updateData = {};
    if (teacher_name !== undefined) updateData.teacher_name = teacher_name;
    if (age !== undefined) updateData.age = age;
    if (course !== undefined) updateData.course = course;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const { error: updateError } = await insforge.update('teacher_list', updateData, [
      { column: 'id', operator: 'eq', value: id }
    ]);

    if (updateError) throw updateError;

    const { data: rows, error: fetchError } = await insforge.select('teacher_list', {
      select: 'id, teacher_name, age, course, phone, email, created_at',
      eq: { column: 'id', value: id }
    });

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      message: '更新成功',
      data: rows && rows[0] ? rows[0] : null
    });
  } catch (error) {
    console.error('更新教师错误:', error.message);
    res.status(500).json({
      success: false,
      message: '更新失败：' + error.message
    });
  }
});

/**
 * @route   PUT /api/teachers/:id/password
 * @desc    修改密码
 */
router.put('/teachers/:id/password', async (req, res) => {
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

    const { data: users, error: queryError } = await insforge.select('teacher_list', {
      select: 'password',
      eq: { column: 'id', value: id }
    });

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];
    const isValid = await bcryptjs.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(newPassword, saltRounds);

    const { error: updateError } = await insforge.update('teacher_list', 
      { password: hashedPassword },
      [{ column: 'id', operator: 'eq', value: id }]
    );

    if (updateError) throw updateError;

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
  }
});

/**
 * @route   POST /api/check-username
 * @desc    检查用户名是否已存在
 */
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: '用户名不能为空' });
    }
    const { data: rows, error } = await insforge.select('teacher_list', {
      select: 'id',
      eq: { column: 'teacher_name', value: username }
    });

    if (error) throw error;

    res.json({ success: true, exists: rows && rows.length > 0 });
  } catch (error) {
    console.error('检查用户名错误:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/admin/login
 * @desc    管理员登录
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const { data: users, error: queryError } = await insforge.select('admin_list', {
      select: 'id, username, age, phone, email, password',
      eq: { column: 'username', value: username }
    });

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '管理员账号或密码错误'
      });
    }

    const admin = users[0];
    const isValid = await bcryptjs.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '管理员账号或密码错误'
      });
    }

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
  }
});

/**
 * @route   GET /api/admin/profile
 * @desc    获取管理员详细信息
 */
router.get('/admin/profile', async (req, res) => {
  try {
    const adminId = req.query.id;
    if (!adminId) {
      return res.status(400).json({ success: false, message: '缺少管理员ID' });
    }

    const { data: rows, error } = await insforge.select('admin_list', {
      select: 'id, username, age, phone, email',
      eq: { column: 'id', value: adminId }
    });

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('获取管理员信息错误:', error.message);
    res.status(500).json({ success: false, message: '获取管理员信息失败：' + error.message });
  }
});

/**
 * @route   PUT /api/admin/profile
 * @desc    更新管理员信息
 */
router.put('/admin/profile', async (req, res) => {
  try {
    const { id, username, age, phone, email } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: '缺少管理员ID' });
    }

    // 如果要修改用户名，检查是否已被占用
    if (username) {
      const { data: existing, error: checkError } = await insforge.select('admin_list', {
        select: 'id',
        eq: { column: 'username', value: username },
        neq: { column: 'id', value: id }
      });

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        return res.status(409).json({ success: false, message: '该用户名已被使用' });
      }
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (age !== undefined) updateData.age = age;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const { error: updateError } = await insforge.update('admin_list', updateData, [
      { column: 'id', operator: 'eq', value: id }
    ]);

    if (updateError) throw updateError;

    const { data: rows, error: fetchError } = await insforge.select('admin_list', {
      select: 'id, username, age, phone, email',
      eq: { column: 'id', value: id }
    });

    if (fetchError) throw fetchError;

    res.json({ success: true, message: '更新成功', data: rows && rows[0] ? rows[0] : null });
  } catch (error) {
    console.error('更新管理员信息错误:', error.message);
    res.status(500).json({ success: false, message: '更新失败：' + error.message });
  }
});

/**
 * @route   PUT /api/admin/password
 * @desc    管理员修改密码
 */
router.put('/admin/password', async (req, res) => {
  try {
    const { id, oldPassword, newPassword } = req.body;

    if (!id || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码至少需要 6 位' });
    }

    const { data: users, error: queryError } = await insforge.select('admin_list', {
      select: 'password',
      eq: { column: 'id', value: id }
    });

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }

    const isValid = await bcryptjs.compare(oldPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '当前密码错误' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    const { error: updateError } = await insforge.update('admin_list',
      { password: hashedPassword },
      [{ column: 'id', operator: 'eq', value: id }]
    );

    if (updateError) throw updateError;

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改管理员密码错误:', error.message);
    res.status(500).json({ success: false, message: '修改密码失败：' + error.message });
  }
});

/**
 * @route   POST /api/user/auth
 * @desc    提交实名认证信息
 */
router.post('/user/auth', async (req, res) => {
  try {
    const { userId, realName, idCard, idCardFront, idCardBack } = req.body;

    if (!userId || !realName || !idCard) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    // 检查是否已有认证记录
    const { data: existing, error: checkError } = await insforge.select('user_auth', {
      select: 'id',
      eq: { column: 'user_id', value: userId }
    });

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      const { error: updateError } = await insforge.update('user_auth', {
        real_name: realName,
        id_card: idCard,
        id_card_front: idCardFront || null,
        id_card_back: idCardBack || null,
        status: 'pending'
      }, [{ column: 'user_id', operator: 'eq', value: userId }]);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await insforge.insert('user_auth', {
        user_id: userId,
        real_name: realName,
        id_card: idCard,
        id_card_front: idCardFront || null,
        id_card_back: idCardBack || null,
        status: 'pending'
      });

      if (insertError) throw insertError;
    }

    res.json({ success: true, message: '认证信息提交成功' });
  } catch (error) {
    console.error('提交认证错误:', error.message);
    res.status(500).json({ success: false, message: '提交认证失败：' + error.message });
  }
});

/**
 * @route   GET /api/user/auth/:userId
 * @desc    获取用户的实名认证信息
 */
router.get('/user/auth/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: rows, error } = await insforge.select('user_auth', {
      select: 'id, user_id, real_name, id_card, id_card_front, id_card_back, status, created_at, updated_at',
      eq: { column: 'user_id', value: userId }
    });

    if (error) throw error;

    if (!rows || rows.length === 0) {
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
  }
});

/**
 * @route   POST /api/user/change-password
 * @desc    用户修改密码
 */
router.post('/user/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码至少需要 6 位' });
    }

    const { data: users, error: queryError } = await insforge.select('teacher_list', {
      select: 'password',
      eq: { column: 'id', value: userId }
    });

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const isValid = await bcryptjs.compare(oldPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '当前密码错误' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    const { error: updateError } = await insforge.update('teacher_list',
      { password: hashedPassword },
      [{ column: 'id', operator: 'eq', value: userId }]
    );

    if (updateError) throw updateError;

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error.message);
    res.status(500).json({ success: false, message: '修改密码失败：' + error.message });
  }
});

/**
 * @route   DELETE /api/user/:id
 * @desc    注销账号 - 删除用户账户
 */
router.delete('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: '缺少用户ID' });
    }

    // 检查用户是否存在
    const { data: users, error: checkError } = await insforge.select('teacher_list', {
      select: 'id',
      eq: { column: 'id', value: id }
    });

    if (checkError) throw checkError;

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 删除用户认证信息（如果有）
    await insforge.remove('user_auth', [{ column: 'user_id', operator: 'eq', value: id }]);

    // 删除用户
    await insforge.remove('teacher_list', [{ column: 'id', operator: 'eq', value: id }]);

    console.log(`✓ 用户 ID:${id} 账号已注销`);

    res.json({ success: true, message: '账号已注销' });
  } catch (error) {
    console.error('注销账号错误:', error.message);
    res.status(500).json({ success: false, message: '注销失败：' + error.message });
  }
});

module.exports = router;
