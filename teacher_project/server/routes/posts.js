const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

const dbPoolConfig = {
  host: 'mysql.sqlpub.com', port: 3306,
  user: 'wangshanghai', password: 'TZw5UYxoPEhwNAM3',
  database: 'wang_tom'
};

// 获取文章列表（支持搜索）
router.get('/posts', async (req, res) => {
  let pool;
  try {
    pool = mysql.createPool(dbPoolConfig);
    const { q } = req.query;
    let sql = `
      SELECT p.id, p.title, LEFT(p.content, 200) as summary, p.author, p.created_at,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT SUM(type=1) FROM likes WHERE post_id = p.id) as like_count
      FROM posts p
    `;
    const params = [];
    if (q && q.trim()) {
      sql += ' WHERE p.title LIKE ? OR p.content LIKE ?';
      const like = '%' + q.trim() + '%';
      params.push(like, like);
    }
    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    rows.forEach(r => { r.like_count = r.like_count || 0; r.comment_count = r.comment_count || 0; });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});

// 获取文章详情
router.get('/posts/:id', async (req, res) => {
  let pool;
  try {
    pool = mysql.createPool(dbPoolConfig);
    const [rows] = await pool.execute(
      'SELECT id, title, content, author, created_at FROM posts WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '文章不存在' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});

// 创建文章
router.post('/posts', async (req, res) => {
  let pool;
  try {
    const { title, content, author } = req.body;
    if (!title || !content || !author) {
      return res.status(400).json({ success: false, message: '标题、内容和作者不能为空' });
    }
    pool = mysql.createPool(dbPoolConfig);
    const id = 'post_' + Date.now();
    await pool.execute(
      'INSERT INTO posts (id, title, content, author) VALUES (?, ?, ?, ?)',
      [id, title, content, author]
    );
    res.json({ success: true, message: '发布成功', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});

// 更新文章
router.put('/posts/:id', async (req, res) => {
  let pool;
  try {
    const { title, content, author } = req.body;
    pool = mysql.createPool(dbPoolConfig);
    const [rows] = await pool.execute('SELECT author FROM posts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '文章不存在' });
    if (rows[0].author !== author) {
      return res.status(403).json({ success: false, message: '无权编辑此文章' });
    }
    await pool.execute(
      'UPDATE posts SET title = ?, content = ? WHERE id = ?',
      [title, content, req.params.id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});

// 获取评论
router.get('/posts/:id/comments', async (req, res) => {
  let pool;
  try {
    pool = mysql.createPool(dbPoolConfig);
    const [rows] = await pool.execute(
      'SELECT id, author_name, content, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});

// 发表评论
router.post('/posts/:id/comments', async (req, res) => {
  let pool;
  try {
    const { author_name, content } = req.body;
    if (!author_name || !content) {
      return res.status(400).json({ success: false, message: '作者和内容不能为空' });
    }
    pool = mysql.createPool(dbPoolConfig);
    await pool.execute(
      'INSERT INTO comments (post_id, author_name, content) VALUES (?, ?, ?)',
      [req.params.id, author_name, content]
    );
    res.json({ success: true, message: '评论成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});

module.exports = router;

// ============ 点赞/点踩 ============

// 获取点赞状态和统计
router.get('/posts/:id/likes', async (req, res) => {
  let pool;
  try {
    pool = mysql.createPool(dbPoolConfig);
    const username = req.query.username || '';
    const [stats] = await pool.execute(
      "SELECT SUM(type=1) as likes, SUM(type=-1) as dislikes FROM likes WHERE post_id = ?",
      [req.params.id]
    );
    let userType = 0;
    if (username) {
      const [rows] = await pool.execute(
        'SELECT type FROM likes WHERE post_id = ? AND username = ?',
        [req.params.id, username]
      );
      if (rows.length > 0) userType = rows[0].type;
    }
    res.json({
      success: true,
      data: {
        likes: stats[0].likes || 0,
        dislikes: stats[0].dislikes || 0,
        userType
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});

// 点赞/取消点赞/点踩
router.post('/posts/:id/likes', async (req, res) => {
  let pool;
  try {
    const { username, type } = req.body; // type: 1=点赞, -1=点踩, 0=取消
    if (!username) return res.status(400).json({ success: false, message: '缺少用户名' });

    pool = mysql.createPool(dbPoolConfig);

    const [existing] = await pool.execute(
      'SELECT id, type FROM likes WHERE post_id = ? AND username = ?',
      [req.params.id, username]
    );

    if (existing.length > 0) {
      if (type === 0 || existing[0].type === type) {
        // 取消
        await pool.execute('DELETE FROM likes WHERE id = ?', [existing[0].id]);
      } else {
        // 切换
        await pool.execute('UPDATE likes SET type = ? WHERE id = ?', [type, existing[0].id]);
      }
    } else if (type !== 0) {
      await pool.execute(
        'INSERT INTO likes (post_id, username, type) VALUES (?, ?, ?)',
        [req.params.id, username, type]
      );
    }

    const [stats] = await pool.execute(
      "SELECT SUM(type=1) as likes, SUM(type=-1) as dislikes FROM likes WHERE post_id = ?",
      [req.params.id]
    );

    res.json({
      success: true,
      message: type === 1 ? '点赞成功' : type === -1 ? '点踩成功' : '已取消',
      data: { likes: stats[0].likes || 0, dislikes: stats[0].dislikes || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (pool) await pool.end();
  }
});
