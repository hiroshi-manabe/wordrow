import { RouterProvider } from 'react-router-dom'
import { appRouter } from './router'
import './App.css'

export default function App() {
  return <RouterProvider router={appRouter} />
}
