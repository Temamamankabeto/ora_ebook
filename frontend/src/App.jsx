import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AuthorSubmit from "./pages/AuthorSubmit.jsx";
import AuthorMyManuscripts from "./pages/AuthorMyManuscripts.jsx";
import EbookDetail from "./pages/EbookDetail.jsx";
import EditorQueue from "./pages/EditorQueue.jsx";
import ReviewQueue from "./pages/ReviewQueue.jsx";
import FinanceQueue from "./pages/FinanceQueue.jsx";
import ProductionQueue from "./pages/ProductionQueue.jsx";
import PublicLibrary from "./pages/PublicLibrary.jsx";
// import FinanceDashboard from './pages/FinanceDashboard';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<PublicLibrary />} />

        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/author/submit" element={<ProtectedRoute><AuthorSubmit /></ProtectedRoute>} />
        <Route path="/author/mine" element={<ProtectedRoute><AuthorMyManuscripts /></ProtectedRoute>} />

        <Route path="/ebooks/:id" element={<ProtectedRoute><EbookDetail /></ProtectedRoute>} />

        <Route path="/editor/queue" element={<ProtectedRoute><EditorQueue /></ProtectedRoute>} />
        <Route path="/reviewer/queue" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
        <Route path="/finance/queue" element={<ProtectedRoute><FinanceQueue /></ProtectedRoute>} />
        <Route path="/production/queue" element={<ProtectedRoute><ProductionQueue /></ProtectedRoute>} />

        {/* <Route path="/finance" element={<PrivateRoute roles={['finance_officer', 'admin']}><FinanceDashboard /></PrivateRoute>} /> */}


        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
