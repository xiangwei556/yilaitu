import React, { useState, useEffect } from 'react';
import { Table, Card, message } from 'antd';
import request from '../../../utils/request';

const Ledger = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await request.get('/points/admin/ledger');
      setData(res);
    } catch (error) {
      message.error('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    { title: '数量', dataIndex: 'amount', key: 'amount' },
    { title: '变动后余额', dataIndex: 'balance_after', key: 'balance_after' },
    { title: '来源', dataIndex: 'source_type', key: 'source_type' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    { title: '时间', dataIndex: 'created_at', key: 'created_at' },
  ];

  return (
    <Card title="积分台账">
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
    </Card>
  );
};

export default Ledger;
