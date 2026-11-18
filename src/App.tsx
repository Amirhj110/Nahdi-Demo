import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { CartPage } from './pages/CartPage'
import { CategoryPage } from './pages/CategoryPage'
import { HomePage } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { RoutinePage } from './pages/RoutinePage'
import { SkinScanPage } from './pages/SkinScanPage'
import { CartProvider } from './state/CartContext'
import { LaylaProvider } from './state/LaylaContext'
import { LocaleProvider } from './state/LocaleContext'
import { NavProvider } from './state/NavContext'

export default function App() {
  return (
    <LocaleProvider>
      <CartProvider>
        <NavProvider>
          <LaylaProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="c/:slug" element={<CategoryPage />} />
                  <Route path="p/:productId" element={<ProductPage />} />
                  <Route path="recommendations" element={<RecommendationsPage />} />
                  <Route path="routine" element={<RoutinePage />} />
                  <Route path="skin-scan" element={<SkinScanPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </LaylaProvider>
        </NavProvider>
      </CartProvider>
    </LocaleProvider>
  )
}
