const express = require('express');
const axios = require('axios');
const expressGraphQL = require('express-graphql').graphqlHTTP;
const {
    buildSchema
} = require('graphql')

const app = express();

const getAxieLatest = async () => {
    const response = await axios.post('https://graphql-gateway.axieinfinity.com/graphql', {
            "operationName": "GetAxieLatest",
            "variables": {
              "from": 0,
              "size": 300,
              "sort": "PriceAsc",
              "auctionType": "All"
            },
            "query": "query GetAxieLatest($from: Int, $sort: SortBy, $size: Int, $auctionType: AuctionType) {\n  axies(from: $from, sort: $sort, size: $size, auctionType: $auctionType) {\n    total\n    results {\n      ...AxieRowData\n   __typename\n    }\n   __typename\n  }\n}\n\nfragment AxieRowData on Axie {\n  id\n  class\n  name\n class\n  stage\n  order {\n    ...OrderInfo\n    __typename\n  }  __typename\n}\n\n fragment OrderInfo on Order {\n  currentPriceUsd\n  __typename\n} \n"
    });
  
    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(response.statusText);
    }
};

// app.use('/graphql', expressGraphQL({
//     graphiql: true
// }))

app.get('/', async (req, res) => {
    const axie = await getAxieLatest();
    res.json(axie);
  });

app.listen(3000, () => {
    console.log('Server running on port 3000');
  });