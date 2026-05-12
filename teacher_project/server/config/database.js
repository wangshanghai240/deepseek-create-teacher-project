// MySQL 数据库配置
const mysql = require('mysql2/promise');

// 数据库连接配置（根据提供的信息）
const dbConfig = {
  host: 'mysql.sqlpub.com',
  port: 3306,
  user: 'wangshanghai',
  password: 'TZw5UYxoPEhwNAM3',
  database: 'wang_tom'
};

// 创建数据库连接池
const createPool = () => {
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
};

// 测试数据库连接
const testConnection = async () => {
  try {
    const pool = createPool();
    await pool.getConnection();
    console.log('✓ MySQL 数据库连接成功');
    return pool;
  } catch (error) {
    console.error('✗ MySQL 数据库连接失败:', error.message);
    throw error;
  }
};

module.exports = { dbConfig, createPool, testConnection };