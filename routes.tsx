import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';
import AddRecordPage from './pages/AddRecordPage';
import Login from './pages/Login';
import AdminPage from './pages/AdminPage';
import SummaryPage from './pages/SummaryPage';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '首页',
    path: '/',
    element: <HomePage />
  },
  {
    name: '登录',
    path: '/login',
    element: <Login />
  },
  {
    name: '管理员',
    path: '/admin',
    element: <AdminPage />
  },
  {
    name: '总结',
    path: '/summary',
    element: <SummaryPage />
  },
  {
    name: '新建事件',
    path: '/events/new',
    element: <CreateEventPage />
  },
  {
    name: '事件详情',
    path: '/events/:id',
    element: <EventDetailPage />
  },
  {
    name: '编辑事件',
    path: '/events/:id/edit',
    element: <EditEventPage />
  },
  {
    name: '添加进展',
    path: '/events/:id/add-record',
    element: <AddRecordPage />
  }
];

export default routes;