import axios from "axios";
import { useEffect, useState } from "react";
import { NavigateFunction, useNavigate, useParams } from "react-router-dom";

export const JoinRoom = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        axios.get('/').then(({ data }) => {
            setUserName(data.name);
        });
    }, []);
    
    return <main>
        <form>
            <input
                type="text"
                placeholder="Enter a name"
                value={userName}
                onChange={ev => setUserName(ev.target.value)}
                required />
            <br></br>
            <button            
                type="button"
                className="blue-button"
                onClick={makeARoom(navigate, userName, params.id || '')}>
                Join room #{params.id}
            </button>
        </form>
    </main>;
};

export const makeARoom = (navigate: NavigateFunction, username: string, roomId: string) => async () => {
    const { data } = await axios.post(`/join-room/${roomId}`, { username });
    navigate(`/room/${data.room_id}`);
};
