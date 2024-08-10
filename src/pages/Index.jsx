import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PlusCircle, Users, Lightbulb, BarChart, UserCircle, MessageSquare, FileText, Database, Bell, LogOut, Home, Settings, Search } from "lucide-react"
import Team from '../components/Team';
import Ideas from '../components/Ideas';
import Progress from '../components/Progress';
import Profile from '../components/Profile';
import ProjectManagement from '../components/ProjectManagement';
import Collaboration from '../components/Collaboration';
import ContentManagement from '../components/ContentManagement';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js'
import { useToast } from "@/components/ui/use-toast"

const supabase = createClient('https://bmkjdankirqsktbkgliy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJta2pkYW5raXJxc2t0YmtnbGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMxMDQ2MzYsImV4cCI6MjAzODY4MDYzNn0.zQXbChBSwQh_85GHWsEHsnjdGbUiW83EOnpkOsENpPE')

const Index = () => {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [newProject, setNewProject] = useState('');
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tables, setTables] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setLoading(true);
        setError(null);
        try {
          await Promise.all([fetchProjects(), fetchAllProjects(), fetchTables(), fetchNotifications()]);
        } catch (err) {
          setError('Failed to fetch data. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(`created_by.eq.${user.id},id.in.(${
        supabase.from('project_members').select('project_id').eq('user_id', user.id)
      })`);
    if (error) throw error;
    setProjects(data);
  };

  const fetchAllProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*');
    if (error) throw error;
    setAllProjects(data);
  };

  const fetchTables = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    if (error) throw error;
    setTables(data.map(table => table.table_name));
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userid', user.id)
      .order('createdat', { ascending: false });
    if (error) throw error;
    setNotifications(data);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const markNotificationAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ isread: true })
      .eq('id', notificationId);
    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, isread: true } : n
      ));
    }
  };

  const handleCreateProject = async () => {
    if (newProject.trim()) {
      try {
        console.log('Creating project:', newProject.trim());
        const { data, error } = await supabase
          .from('projects')
          .insert({ name: newProject.trim(), description: '', created_by: user.id })
          .select();
        if (error) throw error;
        
        console.log('Project created:', data[0]);
        const newProjectData = data[0];
        
        console.log('Adding project member');
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({ project_id: newProjectData.id, user_id: user.id });
        
        if (memberError) throw memberError;
        
        console.log('Project member added');
        setProjects([...projects, newProjectData]);
        setAllProjects([...allProjects, newProjectData]);
        setNewProject('');
        setActiveProject(newProjectData);
        setActiveTab('team');
        toast({
          title: "Project Created",
          description: `You've successfully created the project: ${newProjectData.name}`,
        });
        console.log('Project creation complete');
      } catch (error) {
        console.error('Error creating project:', error);
        toast({
          title: "Error",
          description: "Failed to create project. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.log('Project name is empty');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Welcome to your Hackathon Hub Dashboard!</p>
                {/* Add more dashboard content here if needed */}
              </CardContent>
            </Card>
            <ContentManagement projectId={activeProject?.id} />
          </>
        );
      case 'profile':
        return <Profile />;
      case 'browseProjects':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Browse Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {allProjects.map((project) => (
                  <li key={project.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                    <span>{project.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveProject(project);
                        setActiveTab('team');
                      }}
                    >
                      View Project
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      case 'team':
        return activeProject ? <Team projectId={activeProject.id} /> : null;
      case 'ideas':
        return activeProject ? <Ideas projectId={activeProject.id} /> : null;
      case 'progress':
        return activeProject ? <Progress projectId={activeProject.id} /> : null;
      case 'management':
        return activeProject ? <ProjectManagement projectId={activeProject.id} /> : null;
      case 'collaboration':
        return activeProject ? <Collaboration projectId={activeProject.id} /> : null;
      case 'content':
        return activeProject ? <ContentManagement projectId={activeProject.id} /> : null;
      case 'database':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5">
                {tables.map((table, index) => (
                  <li key={index}>{table}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Hackathon Hub</h1>
          <Button variant="outline" className="w-full mb-4" onClick={() => setActiveTab('dashboard')}>
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button variant="outline" className="w-full mb-4" onClick={() => setActiveTab('profile')}>
            <UserCircle className="mr-2 h-4 w-4" /> Profile
          </Button>
          <Button variant="outline" className="w-full mb-4" onClick={() => setActiveTab('browseProjects')}>
            <Search className="mr-2 h-4 w-4" /> Browse Projects
          </Button>
        </div>
        {user && (
          <div className="p-4 border-t">
            <h2 className="font-semibold mb-2">Your Projects</h2>
            <ul className="space-y-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <Button
                    variant={activeProject?.id === project.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveProject(project);
                      setActiveTab('team');
                    }}
                  >
                    {project.name}
                  </Button>
                </li>
              ))}
            </ul>
            <Button className="w-full mt-4" onClick={() => setActiveTab('newProject')}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Project
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">{activeProject ? activeProject.name : 'Dashboard'}</h2>
            {user ? (
              <Button variant="outline" onClick={async () => {
                await signOut();
                navigate('/signin');
              }}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate('/signin')}>
                <LogOut className="mr-2 h-4 w-4" /> Sign In
              </Button>
            )}
          </div>

          {user && activeProject && (
            <div className="mb-6 flex space-x-2 overflow-x-auto pb-2">
              <Button variant={activeTab === 'team' ? "default" : "outline"} onClick={() => setActiveTab('team')}>
                <Users className="mr-2 h-4 w-4" /> Team
              </Button>
              <Button variant={activeTab === 'ideas' ? "default" : "outline"} onClick={() => setActiveTab('ideas')}>
                <Lightbulb className="mr-2 h-4 w-4" /> Ideas
              </Button>
              <Button variant={activeTab === 'progress' ? "default" : "outline"} onClick={() => setActiveTab('progress')}>
                <BarChart className="mr-2 h-4 w-4" /> Progress
              </Button>
              <Button variant={activeTab === 'management' ? "default" : "outline"} onClick={() => setActiveTab('management')}>
                <Settings className="mr-2 h-4 w-4" /> Management
              </Button>
              <Button variant={activeTab === 'collaboration' ? "default" : "outline"} onClick={() => setActiveTab('collaboration')}>
                <MessageSquare className="mr-2 h-4 w-4" /> Collaboration
              </Button>
              <Button variant={activeTab === 'content' ? "default" : "outline"} onClick={() => setActiveTab('content')}>
                <FileText className="mr-2 h-4 w-4" /> Content
              </Button>
              <Button variant={activeTab === 'database' ? "default" : "outline"} onClick={() => setActiveTab('database')}>
                <Database className="mr-2 h-4 w-4" /> Database
              </Button>
            </div>
          )}

          {user ? (
            activeTab === 'newProject' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create a New Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Input
                      id="newProjectName"
                      name="newProjectName"
                      placeholder="Enter project name"
                      value={newProject}
                      onChange={(e) => setNewProject(e.target.value)}
                    />
                    <Button onClick={handleCreateProject}>Create Project</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              renderContent()
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Hackathon Hub</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Sign in to start collaborating on exciting hackathon projects!</p>
                <Button className="mt-4" onClick={() => navigate('/signin')}>Sign In</Button>
              </CardContent>
            </Card>
          )}

          {user && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>{notification.message}</span>
                      </div>
                      {!notification.isread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
