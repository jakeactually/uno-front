import './App.css';

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Room } from "./Room";
import { JoinRoom } from "./JoinRoom";
import { GameComponent } from "./Game.tsx";
import { Home } from "./Home.tsx";
import axios from 'axios';
import { Toaster } from 'react-hot-toast';

axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = true;

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/room/:id",
    element: <Room />,
  },
  {
    path: "/join-room/:id",
    element: <JoinRoom />,
  },
  {
    path: "/play/:id",
    element: <GameComponent />,
  },
]);

function App() {
  return (
    <>
      <Toaster position="top-right"></Toaster>
      <RouterProvider router={router} />
    </>
  )
}

export default App
