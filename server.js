const express = require('express');
const { Web3 } = require('web3')
const axios = require('axios');
const { ApolloServer, gql } = require('apollo-server-express');

const {axieInfinityABI} = require('./axie-abi')
const { AxieClass } = require('./model');
const {AXIE_CLASS} = require('./utilities')
require('./config')

const web3 = new Web3('https://mainnet.infura.io/v3/28ac3a4115184fa4a1204f5ee9bc9bb6');
const app = express();

const typeDefs = gql`
    type Query {
        callContractMethod(methodName: String!, args: [String]): String
    }

    type Query {
        getAllAxies: [Axie!]!
    }

    type Query{
        getAxiesFromClass(classAxie: [String!]!): [Axie!]!
    }

    type Axie {
        _id: ID!
        name: String!
        stage: Int! 
        class: String!
        currentPrice: Float!
    }

    input AxieInput {
        _id: ID!
        name: String!
        stage: Int! 
        class: String!
        currentPrice: Float!
    }

    type Mutation {
        addMultipleAxiesToClass(axies: [AxieInput!]!, classAxie: String!): [Axie!]!
    }


`;


const resolvers = {
    Query: {
        getAllAxies: async () => { 

            const promises = AXIE_CLASS.map(async (classAxie) => {
                const response = await AxieClass.get(classAxie).find()
                return response
            })

            const results = await Promise.all(promises)
            const allAxies = results.flat()

            return allAxies
        }
    },   
    Query: {
        getAxiesFromClass: async (_, {classAxie}) => { 

            const promises = classAxie.map(async (classAxie) => {
                const response = await AxieClass.get(classAxie).find()
                return response
            })

            const results = await Promise.all(promises)
            const allAxies = results.flat()

            return allAxies

            // const response = await AxieClass.get(classAxie).find()
            // return response
        }
    },
    Mutation: {
        addMultipleAxiesToClass: async (_, { axies, classAxie }) => {
          try {
            let response = await AxieClass.get(classAxie).insertMany(axies);
            return response;
          } catch (error) {
            throw new Error('Failed to add axies');
          }
        },
      },
    Query: {
        callContractMethod: async (_, { methodName, args }) => {
        const contractAddress = '0xF5b0A3eFB8e8E4c201e2A935F110eAaF3FFEcb8d';
        const contractABI = axieInfinityABI;
        const contractInstance = new web3.eth.Contract(contractABI, contractAddress)

        const method = contractInstance.methods[methodName](args);
        const result = await method.call();

        return String(result)
    },
    },
};

const getAxieLatest = async (req, res) => {
    try{
        const responseFetch = await axios.post('https://graphql-gateway.axieinfinity.com/graphql', {
            "operationName": "GetAxieLatest",
            "variables": {
              "from": 0,
              "size": 300,
              "sort": "PriceAsc",
              "auctionType": "All"
            },
            "query": "query GetAxieLatest($from: Int, $sort: SortBy, $size: Int) {\n  axies(from: $from, sort: $sort, size: $size) {\n    total\n    results {\n      ...AxieRowData\n   __typename\n    }\n   __typename\n  }\n}\n\nfragment AxieRowData on Axie {\n  id\n  class\n  name\n class\n  stage\n  order {\n    ...OrderInfo\n    __typename\n  }  __typename\n}\n\n fragment OrderInfo on Order {\n  currentPriceUsd\n  __typename\n} \n"
        });

        const axies = await responseFetch.data.data.axies.results;
        
        const axiesGrouped = new Map() 
        AXIE_CLASS.forEach( (TYPE, i) => {
            axiesGrouped.set(TYPE,  []) 
        })

        axies.forEach((axie, i) => {
            axiesGrouped.get(axie.class.toLowerCase()).push(axie)
        });

        AXIE_CLASS.forEach(async (TYPE, i) => {
            if(axiesGrouped.get(TYPE).length !== 0){

                const mutation = (axies) => `
                mutation {
                    addMultipleAxiesToClass(axies: [
                    ${axies.map((axie) => `{_id: "${axie.id}", name: "${axie.name}", stage: ${axie.stage}, class: "${axie.class}", currentPrice: ${axie.order.currentPriceUsd}}`).join(', ')}
                    ], classAxie: "${TYPE}") {
                        _id
                        name
                        stage
                        class
                        currentPrice
                    }
                }`;

                const responsePost = await axios.post('http://localhost:3000/graphql', {
                    query: mutation(axiesGrouped.get(TYPE)),
                });
            }
        })

        return responseFetch.data;
    }catch(error){
        console.error(error);
    }
};

app.get('/getPostAxies', async (req, res) => {
    const axie = await getAxieLatest();
    res.json(axie);
});

app.get('/getAllFromDB', async (req, res) => {
    try{
        const query = `
        query {
            getAllAxies {
                _id
                name
                stage
                class
                currentPrice
            }
        }`;

        const response = await axios.post('http://localhost:3000/graphql', {
            query: query
        });

        res.json(response.data)
    }catch(error){
        console.error(error)
        throw new Error('Failed to get axies from database');
    }
});


const server = new ApolloServer({ typeDefs, resolvers });
    server.start().then(res => {
    server.applyMiddleware({ app });
    app.listen(3000 , () => 
        console.log(`Gateway API running at port: 3000`)
    );  
});

