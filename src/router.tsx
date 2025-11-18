import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './routes/RootLayout'
import LibraryRoute from './routes/Library'
import PlayRoute from './routes/Play'
import StatsRoute from './routes/Stats'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LibraryRoute /> },
      { path: 'play/:textId', element: <PlayRoute /> },
      { path: 'stats/:textId', element: <StatsRoute /> },
    ],
  },
])
