/**
 * InsForge 客户端配置（使用 REST API 方式）
 * 用于替代原有的 MySQL 数据库连接
 * 避免 ESM-only SDK 与 CommonJS 项目不兼容的问题
 */
const axios = require('axios');

// Anon Key（从 InsForge MCP get-anon-key 获取，永不过期）
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjgyNjJ9.14JsB9lQ8us3Asj0OWNC_FGqtWH5F1cu5_Z1HJubvOQ';

// API Base URL
const BASE_URL = 'https://mgh85si9.us-east.insforge.app';

// 通用请求头
function getHeaders() {
  return {
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
  };
}

/**
 * 数据库查询 - 获取记录列表
 * @param {string} tableName - 表名
 * @param {object} options - 查询选项
 * @returns {Promise<{data: array|null, error: Error|null, count: number|null}>}
 */
async function select(tableName, options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.select) params.append('select', options.select);
    if (options.order) params.append('order', options.order);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    // Support multiple filters: eq, eq2, eq3 or use filters array
    const filterMap = [
      { key: 'eq', op: 'eq' }, { key: 'eq2', op: 'eq' }, { key: 'eq3', op: 'eq' },
      { key: 'neq', op: 'neq' },
      { key: 'like', op: 'like' },
      { key: 'ilike', op: 'ilike' },
      { key: 'gte', op: 'gte' }, { key: 'lte', op: 'lte' },
      { key: 'gt', op: 'gt' }, { key: 'lt', op: 'lt' },
      { key: 'is', op: 'is' },
    ];

    for (const { key, op } of filterMap) {
      if (options[key]) {
        params.append(`${options[key].column}`, `${op}.${String(options[key].value)}`);
      }
    }

    if (options.in) {
      const vals = options.in.values.map(v => encodeURIComponent(v)).join(',');
      params.append(`${options.in.column}=in.(${vals})`);
    }

    const queryStr = params.toString();
    const url = `${BASE_URL}/api/database/records/${tableName}${queryStr ? '?' + queryStr : ''}`;

    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 10000
    });

    const totalCount = parseInt(response.headers['x-total-count'] || response.headers['content-range']?.split('/')[1] || 0);
    return { data: response.data, error: null, count: totalCount };
  } catch (err) {
    return { data: null, error: err.response?.data || err, count: null };
  }
}

/**
 * 数据库查询 - 获取单条记录（按条件过滤后取第一条）
 */
async function selectOne(tableName, options = {}) {
  const result = await select(tableName, { ...options, limit: 1 });
  if (result.data && result.data.length > 0) {
    return { data: result.data[0], error: null };
  }
  return { data: null, error: result.error };
}

/**
 * 数据库插入 - 创建记录
 * @param {string} tableName - 表名
 * @param {object|array} values - 要插入的数据
 * @param {boolean} returnRepresentation - 是否返回创建后的数据
 * @returns {Promise<{data: array|null, error: Error|null}>}
 */
async function insert(tableName, values, returnRepresentation = true) {
  try {
    const insertData = Array.isArray(values) ? values : [values];
    const headers = getHeaders();
    if (returnRepresentation) {
      headers['Prefer'] = 'return=representation';
    }

    const response = await axios.post(
      `${BASE_URL}/api/database/records/${tableName}`,
      insertData,
      { headers, timeout: 10000 }
    );

    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: err.response?.data || err };
  }
}

/**
 * 数据库更新 - 更新记录
 * @param {string} tableName - 表名
 * @param {object} values - 要更新的字段
 * @param {object} filters - 过滤条件 { column, operator, value }
 * @returns {Promise<{data: array|null, error: Error|null}>}
 */
async function update(tableName, values, filters) {
  try {
    const filterStr = filters.map(f => `${f.column}=${f.operator}.${encodeURIComponent(f.value)}`).join('&');
    const headers = getHeaders();
    headers['Prefer'] = 'return=representation';

    const response = await axios.patch(
      `${BASE_URL}/api/database/records/${tableName}?${filterStr}`,
      values,
      { headers, timeout: 10000 }
    );

    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: err.response?.data || err };
  }
}

/**
 * 数据库删除 - 删除记录
 * @param {string} tableName - 表名
 * @param {object} filters - 过滤条件
 * @returns {Promise<{data: array|null, error: Error|null}>}
 */
async function remove(tableName, filters) {
  try {
    const filterStr = filters.map(f => `${f.column}=${f.operator}.${encodeURIComponent(f.value)}`).join('&');

    const response = await axios.delete(
      `${BASE_URL}/api/database/records/${tableName}?${filterStr}`,
      { headers: getHeaders(), timeout: 10000 }
    );

    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: err.response?.data || err };
  }
}

module.exports = {
  select,
  selectOne,
  insert,
  update,
  remove,
  BASE_URL,
  ANON_KEY
};
