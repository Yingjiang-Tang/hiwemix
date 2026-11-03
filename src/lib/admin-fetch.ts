export async function fetchAdminJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("数据加载失败，请重试");
  return response.json();
}
