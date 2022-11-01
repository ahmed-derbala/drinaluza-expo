import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, StatusBar, FlatList,ActivityIndicator, } from 'react-native';
import axios from 'axios'
import { apiRoot } from '../../configs/api.config'
import Header from './Header';
import Card from './user.card';
import { errorHandler } from '../../utils/error';
import appConf from '../../configs/app.config'
const UsersScreen = () => {

    const [isLoading, setLoading] = useState(true);
    const [usersData, setUsersData] = useState([]);

    const fetchUsers = async () => {
        return axios.get(`${apiRoot}/users`)
            .then(res => {
                //console.log(res.data.data,'dddd');
                setUsersData(res.data.data)
                setLoading(false);
                return res.data.data
            })
        .catch(err=>{
            errorHandler({err})
        })
        //console.log(allusers)
    }

    useEffect(() => {
        fetchUsers();
      }, []);

    return (
        <View style={styles.container}>
            <Header label={appConf.name} />
            {/* <Card /> */}
            <StatusBar barStyle="dark-content" />
            {isLoading ? <ActivityIndicator/> : (

            <FlatList
                data={usersData}
                renderItem={({ item }) => {
                    return <Card info={item} />;
                }}
                keyExtractor={(restaurant) => restaurant._id.toString()}
                showsVerticalScrollIndicator={false}
            />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#6c5ce7',
        alignItems: 'center',
        // justifyContent: 'center',
    },
});

export default UsersScreen;