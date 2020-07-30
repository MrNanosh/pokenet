"use strict";
const https = require("https");

const base = {
  host: "pokeapi.co",
  path: "/api/v2/",
};

const makePokeRequest = (api) => (query) => {
  let newOptions = { ...api };
  newOptions.path += query;
  return newOptions;
};

//takes parameters and makes an http request that returns a promise
const httpRequest = (params) => {
  return new Promise((resolve, reject) => {
    https
      .request(params, (response) => {
        let str = "";

        response.on("data", (chunk) => {
          str += chunk;
        });

        response.on("end", () => {
          resolve(str);
        });
      })
      .end();
  });
};

//first set up options for http requests
const allPokemon = makePokeRequest(base)("pokemon");
const pokemonWithAbilityX = makePokeRequest(base)("ability/");
const pokemonWithNameX = makePokeRequest(allPokemon)("/");

//now make options to request
const getAbilityWithName = makePokeRequest(pokemonWithAbilityX);
const getPokemonWithName = makePokeRequest(pokemonWithNameX);

//helper function that takes a pokemon object and returns a list of abilities
const getAbilitiesFor = async (pokemon) => {
  try {
    const pokemonData = await httpRequest(pokemon.url);
    try {
      return JSON.parse(pokemonData).abilities;
    } catch (error) {
      console.error("Pokemon has no abilities");
    }
  } catch (error) {
    console.error("could not find the url");
  }
};

//helper function that gets all pokemon with ability
const getAllPokemonWithAbility = async (ability) => {
  let abilityName = "";

  if (typeof ability === "object") {
    try {
      abilityName = ability.ability.name;
    } catch (error) {
      console.error("object has no ability name");
    }
  } else if (typeof ability === "string") {
    abilityName = ability;
  }

  const abilityData = await httpRequest(getAbilityWithName(abilityName));
  try {
    let pokemonWithAbility = JSON.parse(abilityData).pokemon;
    //filter out data that I don't need (keep only the name and url)
    pokemonWithAbility = pokemonWithAbility.map(
      (object) => object.pokemon.name
    );
    return pokemonWithAbility;
  } catch (error) {
    console.error("ability not found");
  }
};

/*
 * find the shortest path between two pokemon:
 * takes two pokemon and transverses the connectivity graph made by abilities listed in pokeapi
 * returns an array of abilities that is shortest but not necessarily unique
 * several pokemon in between the two given might return the same list of abilities
 **/
async function pokePath(
  origin,
  destination,
  pathArray = [],
  alreadyCheckedPokemon = new Set(),
  alreadyCheckedAbilities = new Set(),
  solutionPaths = []
) {
  //console.log(origin);
  // get origin assuming it its a queue first dequeue
  const originPokemon = await httpRequest(getPokemonWithName(origin[0]));
  alreadyCheckedPokemon.add(origin.shift());

  // get the abilities of the origin (array)
  const originPokemonAbilities = JSON.parse(originPokemon).abilities.map(
    (element) => element.ability
  );
  //console.log(originPokemonAbilities);

  // for each ability check that it hasn't been checked, get all the pokemon with that ability, if any of those pokemon = destination then stop and add that one ability to queue.
  let destinationFound = false;
  for (let ability of originPokemonAbilities) {
    let pathArrayCopy = [...pathArray];
    if (!alreadyCheckedAbilities.has(ability.name)) {
      const nextPokemon = await getAllPokemonWithAbility(ability.name);
      //console.log(nextPokemon);
      if (nextPokemon.includes(destination)) {
        console.log("huzzah!");
        pathArrayCopy.push(ability.name);
        solutionPaths.push(pathArrayCopy);
        destinationFound = true;
      } else {
        // enqueue all pokemon with that ability if they haven't been checked before
        nextPokemon.forEach(async (pokemon) => {
          if (!alreadyCheckedPokemon.has(pokemon)) {
            origin.push(pokemon);
            alreadyCheckedPokemon.add(pokemon);
          }
        });
      }
      console.log(solutionPaths);
      if (!destinationFound) {
        //probably don't want to do this
        alreadyCheckedAbilities.add(ability.name);
        pathArrayCopy.push(ability.name);
        console.log(pathArrayCopy);
        return pokePath(
          origin,
          destination,
          pathArrayCopy,
          alreadyCheckedPokemon,
          alreadyCheckedAbilities,
          solutionPaths
        );
      }
    } else {
      return pokePath(
        origin,
        destination,
        pathArrayCopy,
        alreadyCheckedPokemon,
        alreadyCheckedAbilities,
        solutionPaths
      );
    }
  }
  console.log("uhoh");
  if (!destinationFound) {
    alreadyCheckedAbilities.add(ability.name);
    pathArrayCopy.push(ability.name);
    console.log(pathArrayCopy);
    return pokePath(
      origin,
      destination,
      pathArrayCopy,
      alreadyCheckedPokemon,
      alreadyCheckedAbilities,
      solutionPaths
    );
  }
  return solutionPaths;

  //const pokemonWithSlam = await getAllPokemonWithAbility("lightning-rod");
  //console.log(pokemonWithSlam);
}

pokePath(["pikachu"], "klang").then((solution) => {
  console.log(solution);
});
