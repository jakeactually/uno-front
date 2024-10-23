import axios from "axios";
import { useEffect, useState } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

export const Home = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        axios.get('/').then(({ data }) => {
            setUserName(data.name);
        });
    }, []);
    
    const handleOnSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
        ev.preventDefault();
        makeARoom(navigate, userName);
    };

    return <main>
        <form onSubmit={handleOnSubmit}>
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
                onClick={makeARoom(navigate, userName)}>
                Make a room
            </button>
        </form>
    </main>;
};

export const makeARoom = (navigate: NavigateFunction, username: string) => async () => {
    const { data, status } = await axios.post('/new-room', { username });
    
    if (status === 401) {
        navigate(`/join-room/${data.room_id}`);
    } else {
        navigate(`/room/${data.room_id}`);
    }
};
