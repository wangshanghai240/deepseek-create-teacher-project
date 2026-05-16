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
    CREATE TABLE IF NOT EXISTS user_auth (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      real_name VARCHAR(30) NOT NULL,
      id_card VARCHAR(18) NOT NULL,
      id_card_front VARCHAR(500),
      id_card_back VARCHAR(500),
      status VARCHAR(20) DEFAULT 'unverified',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  
  console.log('✓ 表 user_auth 创建成功');
  const [r] = await p.execute('DESC user_auth');
  console.log(JSON.stringify(r, null, 2));
  await p.end();
})();
