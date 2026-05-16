const mysql = require('mysql2/promise');

(async () => {
  const p = mysql.createPool({
    host: 'mysql.sqlpub.com',
    port: 3306,
    user: 'wangshanghai',
    password: 'TZw5UYxoPEhwNAM3',
    database: 'wang_tom'
  });

  // 1. 查看整个数据库大小
  const [dbSize] = await p.execute(`
    SELECT
      table_schema AS '数据库',
      ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS '总大小(MB)',
      ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 4) AS '总大小(GB)',
      COUNT(*) AS '表数量'
    FROM information_schema.tables
    WHERE table_schema = 'wang_tom'
    GROUP BY table_schema
  `);
  console.log('========== 数据库总大小 ==========');
  console.log(JSON.stringify(dbSize, null, 2));

  // 2. 查看每个表的大小
  const [tables] = await p.execute(`
    SELECT
      table_name AS '表名',
      engine AS '引擎',
      table_rows AS '行数',
      ROUND(data_length / 1024 / 1024, 2) AS '数据大小(MB)',
      ROUND(index_length / 1024 / 1024, 2) AS '索引大小(MB)',
      ROUND((data_length + index_length) / 1024 / 1024, 2) AS '总大小(MB)'
    FROM information_schema.tables
    WHERE table_schema = 'wang_tom'
    ORDER BY data_length + index_length DESC
  `);
  console.log('\n========== 各表大小明细 ==========');
  console.log(JSON.stringify(tables, null, 2));

  // 3. 查看磁盘容量限制
  const [vars] = await p.execute("SHOW VARIABLES LIKE '%max_connections%'");
  console.log('\n========== 数据库配置 ==========');
  console.log(JSON.stringify(vars, null, 2));

  await p.end();
})();
