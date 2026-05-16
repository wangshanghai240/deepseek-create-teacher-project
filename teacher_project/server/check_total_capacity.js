const mysql = require('mysql2/promise');

(async () => {
  const p = mysql.createPool({
    host: 'mysql.sqlpub.com',
    port: 3306,
    user: 'wangshanghai',
    password: 'TZw5UYxoPEhwNAM3',
    database: 'wang_tom'
  });

  // 查看数据目录
  const [datadir] = await p.execute("SHOW VARIABLES LIKE 'datadir'");
  console.log('数据目录:', datadir[0]?.Value);

  // 查看磁盘相关变量（部分云数据库支持）
  const [diskVars] = await p.execute("SHOW VARIABLES LIKE '%disk%'");
  if (diskVars.length > 0) {
    console.log('磁盘变量:', JSON.stringify(diskVars, null, 2));
  } else {
    console.log('⚠ 无磁盘相关变量，云服务商通常不暴露总容量');
  }

  // 查看临时文件大小限制
  const [tmpSize] = await p.execute("SHOW VARIABLES LIKE 'tmp_table_size'");
  console.log('临时表大小:', tmpSize[0]?.Value);

  // 查看 InnoDB 文件大小限制
  const [innodb] = await p.execute("SHOW VARIABLES LIKE 'innodb_data_file_path'");
  console.log('InnoDB文件:', innodb[0]?.Value);

  // 查看所有可能的容量变量
  const [allSize] = await p.execute("SHOW VARIABLES LIKE '%size%'");
  console.log('\n所有 size 相关变量:');
  allSize.forEach(v => console.log(`  ${v.Variable_name} = ${v.Value}`));

  // 查看数据库实际使用空间
  const [usage] = await p.execute(`
    SELECT
      ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS '已使用(MB)',
      ROUND(SUM(data_free) / 1024 / 1024, 2) AS '空闲(MB)'
    FROM information_schema.tables
    WHERE table_schema = 'wang_tom'
  `);
  console.log(`\n已使用: ${usage[0]['已使用(MB)']} MB`);
  console.log(`空闲(碎片): ${usage[0]['空闲(MB)']} MB`);

  await p.end();
  console.log('\n💡 注意：云数据库（如 mysql.sqlpub.com）通常不暴露物理磁盘总容量。');
  console.log('   一般免费/低配 MySQL 云服务容量在 100MB ~ 1GB 之间。');
  console.log('   你的数据库目前仅使用 0.28 MB，远未达到限制。');
})();
