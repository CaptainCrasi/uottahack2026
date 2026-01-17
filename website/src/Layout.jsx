import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';
import Header from './components/Header';
import HistorySidebar from './components/HistorySidebar';
import AuthModal from './components/AuthModal';
import './App.css'; // Ensure global styles are available

const Layout = () => {
    const [user, setUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [modalMode, setModalMode] = useState('login');

    const [projects, setProjects] = useState([]);
    const [savedComments, setSavedComments] = useState([]);

    const navigate = useNavigate();
    const location = useLocation();

    // Supabase Auth and Data Fetching
    const fetchProjects = async () => {
        if (!user) return;
        try {
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;
            setProjects(projectsData || []);

            const { data: commentsData, error: commentsError } = await supabase
                .from('saved_comments')
                .select('*');

            if (commentsError) throw commentsError;
            setSavedComments(commentsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session?.user) {
                setProjects([]);
                setSavedComments([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user]);

    // Handlers
    const handleLoginClick = () => {
        setModalMode('login');
        setIsModalOpen(true);
    };

    const handleSignupClick = () => {
        setModalMode('signup');
        setIsModalOpen(true);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const openMarketGapTool = async () => {
        if (!user) {
            setModalMode('signup');
            setIsModalOpen(true);
            return;
        }
        try {
            const { data, error } = await supabase.from('projects').insert([
                {
                    user_id: user.id,
                    query: "Market Gap Discovery",
                    status: 'completed',
                    matches_count: Math.floor(Math.random() * 20)
                }
            ]).select();
            if (error) throw error;
            fetchProjects();
            navigate('/loading', { state: { projectId: data[0]?.id } });
        } catch (error) {
            console.error('Error:', error);
            navigate('/loading');
        }
    };

    // Shared context for child routes
    const context = {
        user,
        projects,
        savedComments,
        fetchProjects,
        openMarketGapTool,
        setModalMode,
        setIsModalOpen
    };

    return (
        <div className="app-container">
            <Header
                user={user}
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
                onLogoutClick={handleLogout}
                onHistoryClick={() => setIsHistoryOpen(true)}
            />

            {/* Main Content Area */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Outlet context={context} />
            </div>

            <AuthModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialMode={modalMode}
            />

            <HistorySidebar
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                historyItems={projects}
                savedComments={savedComments}
            />
        </div>
    );
};

export default Layout;
