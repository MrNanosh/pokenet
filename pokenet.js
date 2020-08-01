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
    pokemonWithAbility = pokemonWithAbility.map((object) => {
      return { name: object.pokemon.name };
    });
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
  if (typeof origin === "string") {
    origin = [{ name: origin, path: [] }];
  } else {
    throw new Error("origin must be a string");
  }
  console.log(origin);

  // for each ability check that it hasn't been checked, get all the pokemon with that ability, if any of those pokemon = destination then stop and add that one ability to queue.
  while (origin.length > 0) {
    // get origin assuming it its a queue
    const originPokemon = await httpRequest(getPokemonWithName(origin[0].name));
    let pathArrayCopy = [...origin[0].path];
    alreadyCheckedPokemon.add(origin.shift());

    // get the abilities of the origin (array)
    const originPokemonAbilities = JSON.parse(originPokemon).abilities.map(
      (element) => element.ability
    );

    // loop through abilities of that pokemon at the front of the queue
    let destinationFound = false;
    for (let ability of originPokemonAbilities) {
      destinationFound = false;

      let pathArrayCopyCopy = [...pathArrayCopy];
      if (!alreadyCheckedAbilities.has(ability.name)) {
        const nextPokemon = await getAllPokemonWithAbility(ability.name);

        pathArrayCopyCopy.push(ability.name);

        console.log(nextPokemon, " length of pokequeue: ", origin.length);

        if (nextPokemon.some((pokemon) => pokemon.name === destination)) {
          console.log("huzzah!");
          solutionPaths.push(pathArrayCopyCopy);
          destinationFound = true;
        } else {
          //console.log(pathArrayCopy);
        }

        // enqueue all pokemon with that ability if they haven't been checked before
        nextPokemon.forEach(async (pokemon) => {
          if (!alreadyCheckedPokemon.has(pokemon.name)) {
            pokemon["path"] = pathArrayCopyCopy;
            origin.push(pokemon);
            alreadyCheckedPokemon.add(pokemon.name);
          }
        });

        console.log(solutionPaths);

        // if destination is not found then add the ability. otherwise don't so we can find other solutions
        alreadyCheckedAbilities.add(ability.name);
      }
    }
    if (destinationFound) {
      return solutionPaths;
    }
  }
  return solutionPaths;

  //const pokemonWithSlam = await getAllPokemonWithAbility("lightning-rod");
  //console.log(pokemonWithSlam);
}

pokePath("pikachu", "klang").then((solution) => {
  console.log(solution);
});
