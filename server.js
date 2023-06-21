const express = require('express');
const axios = require('axios');
const expressGraphQL = require('express-graphql').graphqlHTTP;
const { AxieClass } = require('./model');
require('./config')
const { ApolloServer, gql } = require('apollo-server-express');
const { buildSchema } = require('graphql')
const {AXIE_CLASS} = require('./utilities')

const app = express();

const typeDefs = gql`
    type Query {
        getAxies: [Axie]
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
        getAxies: async () => await Axie.find({}).exec()
    },
    Mutation: {
        addAxie: async (_, args) => {
            try{
                let response = await Axie.create(args)
                return response
            } catch(e) {
                return e.message
            }
        }
    },
    Mutation: {
        addMultipleAxies: async (_, { axies }) => {
          try {
            let response = await Axie.insertMany(axies);
            return response;
          } catch (error) {
            throw new Error('Failed to add axies');
          }
        },
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
            "query": "query GetAxieLatest($from: Int, $sort: SortBy, $size: Int, $auctionType: AuctionType) {\n  axies(from: $from, sort: $sort, size: $size, auctionType: $auctionType) {\n    total\n    results {\n      ...AxieRowData\n   __typename\n    }\n   __typename\n  }\n}\n\nfragment AxieRowData on Axie {\n  id\n  class\n  name\n class\n  stage\n  order {\n    ...OrderInfo\n    __typename\n  }  __typename\n}\n\n fragment OrderInfo on Order {\n  currentPriceUsd\n  __typename\n} \n"
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
        
        // const responsePost = await axios.post('http://localhost:3000/graphql', {
        //     query: mutation(axies),
        // });

        return responseFetch.data;
    }catch(error){
        console.error(error);
    }
};

app.get('/', async (req, res) => {
    const axie = await getAxieLatest();
    res.json(axie);
  });

const server = new ApolloServer({ typeDefs, resolvers });
    server.start().then(res => {
    server.applyMiddleware({ app });
    app.listen(3000 , () => 
        console.log(`Gateway API running at port: 3000`)
    );  
});

