const express = require('express');
const insforge = require('../config/insforge');
const router = express.Router();

// 获取文章列表（支持搜索）
router.get('/posts', async (req, res) => {
  try {
    const { q } = req.query;

    let options = {
      order: 'created_at.desc'
    };

    if (q && q.trim()) {
      options.ilike = { column: 'title', value: '%' + q.trim() + '%' };
    }

    const { data: rows, error } = await insforge.select('posts', options);

    if (error) throw error;

    // 获取每篇文章的评论数和点赞数
    const result = await Promise.all((rows || []).map(async (row) => {
      const { data: comments } = await insforge.select('comments', {
        select: 'id',
        eq: { column: 'post_id', value: row.id }
      });

      const { data: likes } = await insforge.select('likes', {
        select: 'type',
        eq: { column: 'post_id', value: row.id }
      });

      const likeCount = (likes || []).filter(l => l.type === 1).length;
      const commentCount = (comments || []).length || 0;

      return {
        ...row,
        summary: row.content ? row.content.substring(0, 200) : '',
        comment_count: commentCount,
        like_count: likeCount
      };
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取文章详情
router.get('/posts/:id', async (req, res) => {
  try {
    const { data: rows, error } = await insforge.select('posts', {
      select: 'id, title, content, author, created_at',
      eq: { column: 'id', value: req.params.id }
    });

    if (error) throw error;

    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: '文章不存在' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建文章
router.post('/posts', async (req, res) => {
  try {
    const { title, content, author } = req.body;
    if (!title || !content || !author) {
      return res.status(400).json({ success: false, message: '标题、内容和作者不能为空' });
    }
    const id = 'post_' + Date.now();
    const { data, error } = await insforge.insert('posts', { id, title, content, author });

    if (error) throw error;

    res.json({ success: true, message: '发布成功', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新文章
router.put('/posts/:id', async (req, res) => {
  try {
    const { title, content, author } = req.body;

    const { data: rows, error: fetchError } = await insforge.select('posts', {
      select: 'author',
      eq: { column: 'id', value: req.params.id }
    });

    if (fetchError) throw fetchError;

    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: '文章不存在' });
    if (rows[0].author !== author) {
      return res.status(403).json({ success: false, message: '无权编辑此文章' });
    }

    const { error: updateError } = await insforge.update('posts',
      { title, content },
      [{ column: 'id', operator: 'eq', value: req.params.id }]
    );

    if (updateError) throw updateError;

    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取评论
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { data: rows, error } = await insforge.select('comments', {
      select: 'id, author_name, content, created_at',
      eq: { column: 'post_id', value: req.params.id },
      order: 'created_at.asc'
    });

    if (error) throw error;

    res.json({ success: true, data: rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 发表评论
router.post('/posts/:id/comments', async (req, res) => {
  try {
    const { author_name, content } = req.body;
    if (!author_name || !content) {
      return res.status(400).json({ success: false, message: '作者和内容不能为空' });
    }
    const { error } = await insforge.insert('comments', { post_id: req.params.id, author_name, content });

    if (error) throw error;

    res.json({ success: true, message: '评论成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ 点赞/点踩 ============

// 获取点赞状态和统计
router.get('/posts/:id/likes', async (req, res) => {
  try {
    const username = req.query.username || '';

    const { data: likes, error } = await insforge.select('likes', {
      select: 'type, username',
      eq: { column: 'post_id', value: req.params.id }
    });

    if (error) throw error;

    const likesCount = (likes || []).filter(l => l.type === 1).length;
    const dislikesCount = (likes || []).filter(l => l.type === -1).length;

    let userType = 0;
    if (username) {
      const userLike = (likes || []).find(l => l.username === username);
      if (userLike) userType = userLike.type;
    }

    res.json({
      success: true,
      data: { likes: likesCount, dislikes: dislikesCount, userType }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 点赞/取消点赞/点踩
router.post('/posts/:id/likes', async (req, res) => {
  try {
    const { username, type } = req.body;
    if (!username) return res.status(400).json({ success: false, message: '缺少用户名' });

    const { data: existing, error: fetchError } = await insforge.select('likes', {
      select: 'id, type',
      eq: { column: 'post_id', value: req.params.id },
      eq2: { column: 'username', value: username }
    });

    if (fetchError) throw fetchError;

    if (existing && existing.length > 0) {
      if (type === 0 || existing[0].type === type) {
        await insforge.remove('likes', [{ column: 'id', operator: 'eq', value: existing[0].id }]);
      } else {
        await insforge.update('likes', { type }, [{ column: 'id', operator: 'eq', value: existing[0].id }]);
      }
    } else if (type !== 0) {
      await insforge.insert('likes', { post_id: req.params.id, username, type });
    }

    const { data: likes } = await insforge.select('likes', {
      select: 'type',
      eq: { column: 'post_id', value: req.params.id }
    });

    const likesCount = (likes || []).filter(l => l.type === 1).length;
    const dislikesCount = (likes || []).filter(l => l.type === -1).length;

    res.json({
      success: true,
      message: type === 1 ? '点赞成功' : type === -1 ? '点踩成功' : '已取消',
      data: { likes: likesCount, dislikes: dislikesCount }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
