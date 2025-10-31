export function logJobResult(db, jobId, result, error = null) {
  const payload = error ? formatError(error) : formatResult(result);
  return db('job_logs').insert({
    job_id: jobId,
    executed_at: new Date(),
    result_json: JSON.stringify(payload)
  });
}

function formatError(error) {
  return {
    error: true,
    message: error?.message || String(error)
  };
}

function formatResult(result) {
  try {
    // mysql2 raw returns [rows, fields] often under knex.raw
    if (Array.isArray(result)) {
      const rows = Array.isArray(result[0]) ? result[0] : result;
      return { error: false, rowsPreview: rows.slice(0, 20) };
    }
    if (result?.[0]) {
      return { error: false, rowsPreview: result[0].slice(0, 20) };
    }
    if (result?.rows) {
      return { error: false, rowsPreview: result.rows.slice(0, 20) };
    }
    return { error: false, data: result };
  } catch (e) {
    return { error: false, data: result };
  }
}