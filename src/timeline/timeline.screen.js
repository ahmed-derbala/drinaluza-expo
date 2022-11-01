import { Text, View } from 'react-native';
import axios from 'axios'
import {apiRoot} from '../../configs/api.config'



const fetchusers = async () => {
    let allusers = await axios.get(`${apiRoot}/users`)
    //.then(res=>console.log(res.data,'rrrrrrrrrr'))
    //.catch(err=>console.error(err))
    //console.log(allusers)
}
fetchusers()
export default function TimelineScreen() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>TimelineScreennnnn!</Text>
        </View>
    );
}