import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc,
    query, 
    where,
    getDocs,
    setDoc, 
    getDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";



const appId = process.env.REACT_APP_APP_ID;
// const firebaseConfig = typeof __firebase_config !== 'undefined' 
//     ? JSON.parse(__firebase_config) 
//     : {
//         apiKey: process.env.REACT_APP_API_KEY,
//         authDomain: process.env.REACT_APP_AUTH_DOMAIN,
//         projectId: process.env.REACT_APP_PROJECT_ID,
//         storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
//         messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
//         appId: app_id,
//         measurementId: process.env.REACT_APP_ID_MEASUREMENT_ID
//       };

    
const firebaseConfig = {
        apiKey: process.env.REACT_APP_API_KEY,
        authDomain: process.env.REACT_APP_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_PROJECT_ID,
        storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_APP_ID || 'default-app-id',
        measurementId: process.env.REACT_APP_ID_MEASUREMENT_ID
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);




const usersPath = `artifacts/${appId}/public/data/users`;
const eventsPath = `artifacts/${appId}/public/data/events`;
const registrationsPath = `artifacts/${appId}/public/data/registrations`;


const seedDatabase = async () => {
    console.log("Checking if database needs seeding...");
    const eventsCollectionRef = collection(db, eventsPath);
    const eventsSnap = await getDocs(eventsCollectionRef);
    if (!eventsSnap.empty) {
        console.log("Database already contains event data.");
        return;
    }
    console.log("Seeding database with initial data...");

    const users = [
        { uid: 'student1', name: 'Alice', role: 'student' },
        { uid: 'organizer1', name: 'Charlie', role: 'organizer' },
        { uid: 'admin1', name: 'Diana', role: 'admin' },
    ];
    for (const user of users) {
        await setDoc(doc(db, usersPath, user.uid), user);
    }
    console.log("Users seeded.");

    const events = [
        { name: 'Tech Conference 2025', description: 'Annual tech conference with guest speakers from around the world. Join us for a full day of learning and networking.', date: '2025-10-15', organizerId: 'organizer1', location: 'Main Auditorium' },
        { name: 'Campus Music Festival', description: 'A day of live music from local bands and artists. Food trucks and fun activities available all day.', date: '2025-11-05', organizerId: 'organizer1', location: 'University Lawn' },
    ];
    for (const event of events) {
        await addDoc(collection(db, eventsPath), event);
    }
    console.log("Events seeded.");
};



const Modal = ({ message, onClose }) => {
    if (!message) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full mx-4">
                <p className="mb-6 text-lg text-gray-800">{message}</p>
                <button onClick={onClose} className="bg-indigo-600 text-white font-bold py-2 px-8 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
                    Close
                </button>
            </div>
        </div>
    );
};

const EventCard = ({ event, onSelectEvent }) => {
    const [attendeeCount, setAttendeeCount] = useState(0);

    useEffect(() => {
        const q = query(collection(db, registrationsPath), where("eventId", "==", event.id), where("status", "==", "approved"));
        const unsubscribe = onSnapshot(q, (snapshot) => setAttendeeCount(snapshot.size));
        return () => unsubscribe();
    }, [event.id]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{event.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
            </div>
            <div className="flex justify-between items-center mt-4">
                <div>
                    <p className="text-sm text-gray-500">Date: {event.date}</p>
                    <p className="text-sm font-semibold text-indigo-600">
                        Live Attendees: <span className="text-2xl">{attendeeCount}</span>
                    </p>
                </div>
                <button onClick={() => onSelectEvent(event)} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                    View Details
                </button>
            </div>
        </div>
    );
};

const EventDetail = ({ event, user, onRegister, onBack }) => {
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState(null);

    useEffect(() => {
        if (user?.role === 'student') {
            const q = query(collection(db, registrationsPath), where("eventId", "==", event.id), where("userId", "==", user.uid));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    setIsRegistered(true);
                    setRegistrationStatus(snapshot.docs[0].data().status);
                } else {
                    setIsRegistered(false);
                    setRegistrationStatus(null);
                }
            });
            return () => unsubscribe();
        }
    }, [event.id, user]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <button onClick={onBack} className="mb-6 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                &larr; Back to Events
            </button>
            <h2 className="text-4xl font-bold text-gray-800 mb-4">{event.name}</h2>
            <p className="text-lg text-gray-600 mb-2"><strong>Date:</strong> {event.date}</p>
            <p className="text-lg text-gray-600 mb-4"><strong>Location:</strong> {event.location}</p>
            <p className="text-gray-700 mb-6">{event.description}</p>
            
            {user?.role === 'student' && (
                <>
                    {!isRegistered ? (
                        <button onClick={() => onRegister(event.id)} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                            Confirm Registration
                        </button>
                    ) : (
                        <div className={`w-full text-center font-bold py-3 px-4 rounded-lg text-sm ${
                            registrationStatus === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                            registrationStatus === 'approved' ? 'bg-green-200 text-green-800' :
                            'bg-red-200 text-red-800'
                        }`}>
                            Registration Status: {registrationStatus.charAt(0).toUpperCase() + registrationStatus.slice(1)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const StudentDashboard = ({ user, showModal }) => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, eventsPath), (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(eventsData);
        });
        return () => unsubscribe();
    }, []);

    const handleRegister = async (eventId) => {
        try {
            await addDoc(collection(db, registrationsPath), {
                eventId: eventId, userId: user.uid, userName: user.name, status: 'pending',
            });
            showModal("Registration successful! Your request is pending approval.");
        } catch (error) {
            console.error("Error registering for event: ", error);
            showModal("Registration failed. Please try again.");
        }
    };

    if (selectedEvent) {
        return <EventDetail event={selectedEvent} user={user} onRegister={handleRegister} onBack={() => setSelectedEvent(null)} />;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Available Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map(event => (
                    <EventCard key={event.id} event={event} onSelectEvent={setSelectedEvent} />
                ))}
            </div>
        </div>
    );
};

const OrganizerDashboard = ({ user, showModal }) => {
    const [registrations, setRegistrations] = useState([]);

    useEffect(() => {
        const q = query(collection(db, registrationsPath), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const regsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRegistrations(regsData);
        });
        return () => unsubscribe();
    }, []);

    const handleRegistration = async (regId, newStatus) => {
        try {
            await updateDoc(doc(db, registrationsPath, regId), { status: newStatus });
            showModal(`Registration has been ${newStatus}.`);
        } catch (error) {
            console.error("Error updating registration: ", error);
            showModal("Failed to update registration.");
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Manage Registrations</h2>
            <h3 className="text-xl font-semibold mb-4">Pending Requests</h3>
            {registrations.length > 0 ? (
                <ul className="space-y-4">
                    {registrations.map(reg => (
                        <li key={reg.id} className="flex flex-wrap justify-between items-center p-4 bg-gray-50 rounded-lg gap-4">
                            <div>
                                <p className="font-semibold">{reg.userName}</p>
                                <p className="text-sm text-gray-600">Event ID: {reg.eventId.substring(0,10)}...</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleRegistration(reg.id, 'approved')} className="bg-green-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-600">Approve</button>
                                <button onClick={() => handleRegistration(reg.id, 'rejected')} className="bg-red-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-red-600">Reject</button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p>No pending registration requests.</p>}
        </div>
    );
};

const AdminDashboard = ({ user, showModal }) => {
    const [events, setEvents] = useState([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', date: '', location: '' });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, eventsPath), (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(eventsData);
        });
        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleShowForm = (event = null) => {
        setCurrentEvent(event);
        setFormData(event ? { name: event.name, description: event.description, date: event.date, location: event.location } : { name: '', description: '', date: '', location: '' });
        setIsFormVisible(true);
    };

    const handleHideForm = () => {
        setIsFormVisible(false);
        setCurrentEvent(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentEvent) {
                await updateDoc(doc(db, eventsPath, currentEvent.id), formData);
                showModal("Event updated successfully!");
            } else {
                await addDoc(collection(db, eventsPath), { ...formData, organizerId: user.uid });
                showModal("Event created successfully!");
            }
            handleHideForm();
        } catch (error) {
            console.error("Error saving event:", error);
            showModal("Failed to save event.");
        }
    };

    const handleDelete = async (eventId) => {
        if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, eventsPath, eventId));
                showModal("Event deleted successfully.");
            } catch (error) {
                console.error("Error deleting event:", error);
                showModal("Failed to delete event.");
            }
        }
    };

    if (isFormVisible) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">{currentEvent ? 'Edit Event' : 'Create New Event'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Event Name" className="w-full p-3 border rounded-lg" required />
                    <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Event Description" className="w-full p-3 border rounded-lg" required />
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="Event Location" className="w-full p-3 border rounded-lg" required />
                    <div className="flex space-x-4">
                        <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700">Save Event</button>
                        <button type="button" onClick={handleHideForm} className="flex-1 bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-400">Cancel</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Manage Events</h2>
                <button onClick={() => handleShowForm()} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
                    + Create Event
                </button>
            </div>
            <ul className="space-y-4">
                {events.map(event => (
                    <li key={event.id} className="flex flex-wrap justify-between items-center p-4 bg-gray-50 rounded-lg gap-4">
                        <div>
                            <p className="font-semibold">{event.name}</p>
                            <p className="text-sm text-gray-600">{event.date}</p>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => handleShowForm(event)} className="bg-blue-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-blue-600">Edit</button>
                            <button onClick={() => handleDelete(event.id)} className="bg-red-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-red-600">Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};


// Main App Component
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLogin, setShowLogin] = useState(true);
    const [modalMessage, setModalMessage] = useState('');

    const showModal = (message) => setModalMessage(message);
    const closeModal = () => setModalMessage('');

    useEffect(() => {
        const authenticateUser = async () => {
            try {
                if (process.env.REACT_APP_AUTH_DOMAIN) {
                    await signInWithCustomToken(auth, process.env.REACT_APP_AUTH_DOMAIN);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
                showModal(`Authentication failed: ${error.message}`);
            }
        };
        authenticateUser();
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) setUser(null);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        seedDatabase();
    }, []);

    const handleLogin = async (selectedRole) => {
        const mockUsers = {
            student: { uid: 'student1', name: 'Alice', role: 'student' },
            organizer: { uid: 'organizer1', name: 'Charlie', role: 'organizer' },
            admin: { uid: 'admin1', name: 'Diana', role: 'admin' },
        };
        const selectedUser = mockUsers[selectedRole];
        const userDoc = await getDoc(doc(db, usersPath, selectedUser.uid));
        setUser(userDoc.exists() ? { ...userDoc.data(), uid: selectedUser.uid } : selectedUser);
        setShowLogin(false);
    };

    const handleLogout = () => {
        setUser(null);
        setShowLogin(true);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><p className="text-lg">Loading Campus Events...</p></div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <Modal message={modalMessage} onClose={closeModal} />
            <header className="bg-white shadow-md">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-indigo-600">Infinite Locus Events</h1>
                    {user && (
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Welcome, <span className="font-semibold">{user.name}</span> ({user.role})</span>
                            <button onClick={handleLogout} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                                Log Out
                            </button>
                        </div>
                    )}
                </nav>
            </header>

            <main className="container mx-auto px-6 py-8">
                {showLogin ? (
                    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg text-center">
                        <h2 className="text-2xl font-bold mb-6">Select Your Role</h2>
                        <div className="space-y-4">
                             <button onClick={() => handleLogin('student')} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700">Log in as Student (Alice)</button>
                             <button onClick={() => handleLogin('organizer')} className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600">Log in as Organizer (Charlie)</button>
                             <button onClick={() => handleLogin('admin')} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800">Log in as Admin (Diana)</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {user?.role === 'student' && <StudentDashboard user={user} showModal={showModal} />}
                        {user?.role === 'organizer' && <OrganizerDashboard user={user} showModal={showModal} />}
                        {user?.role === 'admin' && <AdminDashboard user={user} showModal={showModal} />}
                    </>
                )}
            </main>
        </div>
    );
}
