const mysql = require('mysql2/promise');

(async () => {
  const p = mysql.createPool({
    host: 'mysql.sqlpub.com',
    port: 3306,
    user: 'wangshanghai',
    password: 'TZw5UYxoPEhwNAM3',
    database: 'wang_tom'
  });

  await p.execute(`
    CREATE TABLE IF NOT EXISTS news (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      summary TEXT,
      content TEXT,
      reporter VARCHAR(100),
      source VARCHAR(255) DEFAULT 'news.cctv.com',
      source_url VARCHAR(500),
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✓ news 表创建成功');
  const [r] = await p.execute('DESC news');
  console.log(JSON.stringify(r, null, 2));
  await p.end();
})();
