import { Layout, Menu } from 'antd'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Settings from './pages/Settings'
import Coupons from './pages/Coupons'
import HotOffers from './pages/HotOffers'
import LanguageSwitch from './components/LanguageSwitch'
import { useTranslation } from 'react-i18next'
const { Sider, Header, Content } = Layout

export default function AppRoutes(){
  const { pathname } = useLocation()
  const { t } = useTranslation('common')
  const selected = pathname.split('/')[1] || 'dashboard'
  return (
    <Layout style={{minHeight:'100vh'}}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{color:'#fff', padding:16, fontWeight:700}}>Fasket Admin</div>
        <Menu theme="dark" mode="inline" selectedKeys={[selected]} items={[
          { key: 'dashboard', label: <Link to="/">Dashboard</Link> },
          { key: 'products', label: <Link to="/products">Products</Link> },
          { key: 'hot-offers', label: <Link to="/hot-offers">Hot Offers</Link> },
          { key: 'categories', label: <Link to="/categories">Categories</Link> },
          { key: 'orders', label: <Link to="/orders">Orders</Link> },
          { key: 'customers', label: <Link to="/customers">Customers</Link> },
          { key: 'coupons', label: <Link to="/coupons">Coupons</Link> },
          { key: 'settings', label: <Link to="/settings">Settings</Link> }
        ]}/>
      </Sider>
      <Layout>
      <Header style={{ background: '#fff', display:'flex', justifyContent:'flex-end', paddingInline:16 }}>
          <LanguageSwitch/>
        </Header>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="hot-offers" element={<HotOffers />} />
            <Route path="categories" element={<Categories />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}
