import * as React from "react";
//import { ErrorBoundary } from "react-error-boundary";
import { View, StyleSheet, Button,Text } from "react-native";

/**
 * handle errors
 * @param {Object} error 
 * @param {Object | String} error.err the error message or object
 * @param {Request} error.req request object
 * @param {Response} error.res response object
 * @param {Next} error.next next object
 */
exports.errorHandler = ({ err }) => {
    console.log('errorHandler...')
  alert(err)
}


const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "column",
      alignItems: "stretch",
      justifyContent: "center",
      alignContent: "center",
      paddingHorizontal: 12,
    },
  });