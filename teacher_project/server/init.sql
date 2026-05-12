-- MySQL 数据库初始化脚本
-- 用于创建 teacher_list 表和测试数据

USE wang_tom;

-- 如果表已存在，先删除（可选）
DROP TABLE IF EXISTS `teacher_list`;

-- 创建教师用户表
CREATE TABLE `teacher_list` (
  `id` INT(11) NOT NULL AUTO_INCREMENT COMMENT '用户 ID',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  `email` VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱地址',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教师用户表';

-- 插入测试数据（使用示例密码：123456）
INSERT INTO `teacher_list` (username, password_hash, email) VALUES 
('admin', '$2a$10$rOy9.7vHqJZKQXGzVjLp.eY8xPmNwRtSfUgHbCdEfGhIjKlMnOpQrStu', 'admin@example.com'),
('teacher_zhang', '$2a$10$rOy9.7vHqJZKQXGzVjLp.eY8xPmNwRtSfUgHbCdEfGhIjKlMnOpQrStu', 'zhang@example.com'),
('teacher_li', '$2a$10$rOy9.7vHqJZKQXGzVjLp.eY8xPmNwRtSfUgHbCdEfGhIjKlMnOpQrStu', 'li@example.com');

-- 显示表结构
DESC `teacher_list`;

SELECT '数据库初始化完成！' AS message;