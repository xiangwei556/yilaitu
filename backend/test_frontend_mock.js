// 模拟前端API调用
const mockApiResponse = {
  code: 0,
  msg: "success",
  data: {
    total: 5,
    items: [
      {
        id: 5,
        name: "咖啡馆",
        image_url: "/api/v1/sys-images/files/scenes/6c23c51a22c24d7aa359945e3e4079d2.png",
        style: 1,
        status: "enabled",
        created_at: "2026-01-12T22:16:17",
        updated_at: "2026-01-12T22:16:17"
      },
      {
        id: 6,
        name: "专业会员",
        image_url: "/api/v1/sys-images/files/scenes/406b1b719c9e4a6c831c918a3845344d.webp",
        style: 1,
        status: "enabled",
        created_at: "2026-01-13T16:23:47",
        updated_at: "2026-01-13T16:23:47"
      }
    ]
  }
};

console.log("模拟后端API响应:");
console.log(JSON.stringify(mockApiResponse, null, 2));

// 模拟前端request.js的响应拦截器
const res = mockApiResponse;
const interceptedData = res.data;

console.log("\n前端request.js拦截器处理后的数据:");
console.log(JSON.stringify(interceptedData, null, 2));

// 检查第一个item是否包含style字段
if (interceptedData.items && interceptedData.items.length > 0) {
  const firstItem = interceptedData.items[0];
  console.log("\n第一个item:");
  console.log(`  id: ${firstItem.id}`);
  console.log(`  name: ${firstItem.name}`);
  console.log(`  style: ${firstItem.style}`);
  console.log(`  status: ${firstItem.status}`);
  
  if ('style' in firstItem) {
    console.log(`\n✓ 第一个item包含style字段: ${firstItem.style}`);
  } else {
    console.log(`\n✗ 第一个item不包含style字段`);
    console.log(`  实际字段: ${Object.keys(firstItem)}`);
  }
}
