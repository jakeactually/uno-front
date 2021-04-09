import axios from "axios";
import { useEffect, useState } from "react";
import { useHistory, useRouteMatch } from "react-router-dom";

export const JoinRoom = () => {
    const history = useHistory();
    const { params } = useRouteMatch();
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
                onClick={makeARoom(history, userName, params.id)}>
                Join room #{params.id}
            </button>
        </form>
    </main>;
};

export const makeARoom = (history, username, roomId) => async () => {
    const { data } = await axios.post(`/join-room/${roomId}`, { username });
    history.push(`/room/${data.room_id}`);
};
