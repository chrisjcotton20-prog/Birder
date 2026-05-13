import { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, RefreshCw, Settings, AlertCircle, Check, X, FileText, Feather, List, Search, Square, CheckSquare, Map as MapIcon } from 'lucide-react';
import { storage } from './lib/storage.js';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { contourDensity } from 'd3-contour';
import { feature, mesh, merge } from 'topojson-client';
import statesTopo from 'us-atlas/states-10m.json';

// ============================================================================
// THE TOTAL — derived from the ABA Checklist v8.0.7 (Jan 2021, 1,120 species)
//   filtered to:
//   • ABA Codes 1–3 only (regular & rare-but-annual; excludes vagrants like
//     Steller's Sea-Eagle which are Codes 4–5, and extinct/extirpated Code 6)
//   • Native species only (excludes the 52 established exotics on ABA's
//     Introduced Species list — House Sparrow, Starling, Rock Pigeon, Hawaiian
//     introductions, etc. Species native to mainland US that have introduced
//     populations elsewhere — Mallard, Wild Turkey — are kept.)
//
//   Sources:
//     https://www.aba.org/aba-checklist/
//     https://www.aba.org/aba-area-introduced-species/
// ============================================================================

// 774 native, regularly-occurring species in ABA taxonomic order: [common, sci]
const NATIVE_SPECIES = [
  ["Black-bellied Whistling-Duck","Dendrocygna autumnalis"],
  ["Fulvous Whistling-Duck","Dendrocygna bicolor"],
  ["Emperor Goose","Anser canagicus"],
  ["Snow Goose","Anser caerulescens"],
  ["Ross's Goose","Anser rossii"],
  ["Greater White-fronted Goose","Anser albifrons"],
  ["Taiga Bean-Goose","Anser fabalis"],
  ["Tundra Bean-Goose","Anser serrirostris"],
  ["Brant","Branta bernicla"],
  ["Cackling Goose","Branta hutchinsii"],
  ["Canada Goose","Branta canadensis"],
  ["Hawaiian Goose","Branta sandvicensis"],
  ["Trumpeter Swan","Cygnus buccinator"],
  ["Tundra Swan","Cygnus columbianus"],
  ["Whooper Swan","Cygnus cygnus"],
  ["Muscovy Duck","Cairina moschata"],
  ["Wood Duck","Aix sponsa"],
  ["Blue-winged Teal","Spatula discors"],
  ["Cinnamon Teal","Spatula cyanoptera"],
  ["Northern Shoveler","Spatula clypeata"],
  ["Gadwall","Mareca strepera"],
  ["Eurasian Wigeon","Mareca penelope"],
  ["American Wigeon","Mareca americana"],
  ["Laysan Duck","Anas laysanensis"],
  ["Hawaiian Duck","Anas wyvilliana"],
  ["Mallard","Anas platyrhynchos"],
  ["Mexican Duck","Anas diazi"],
  ["American Black Duck","Anas rubripes"],
  ["Mottled Duck","Anas fulvigula"],
  ["Northern Pintail","Anas acuta"],
  ["Green-winged Teal","Anas crecca"],
  ["Canvasback","Aythya valisineria"],
  ["Redhead","Aythya americana"],
  ["Common Pochard","Aythya ferina"],
  ["Ring-necked Duck","Aythya collaris"],
  ["Tufted Duck","Aythya fuligula"],
  ["Greater Scaup","Aythya marila"],
  ["Lesser Scaup","Aythya affinis"],
  ["Steller's Eider","Polysticta stelleri"],
  ["Spectacled Eider","Somateria fischeri"],
  ["King Eider","Somateria spectabilis"],
  ["Common Eider","Somateria mollissima"],
  ["Harlequin Duck","Histrionicus histrionicus"],
  ["Surf Scoter","Melanitta perspicillata"],
  ["White-winged Scoter","Melanitta deglandi"],
  ["Black Scoter","Melanitta americana"],
  ["Long-tailed Duck","Clangula hyemalis"],
  ["Bufflehead","Bucephala albeola"],
  ["Common Goldeneye","Bucephala clangula"],
  ["Barrow's Goldeneye","Bucephala islandica"],
  ["Smew","Mergellus albellus"],
  ["Hooded Merganser","Lophodytes cucullatus"],
  ["Common Merganser","Mergus merganser"],
  ["Red-breasted Merganser","Mergus serrator"],
  ["Masked Duck","Nomonyx dominicus"],
  ["Ruddy Duck","Oxyura jamaicensis"],
  ["Plain Chachalaca","Ortalis vetula"],
  ["Mountain Quail","Oreortyx pictus"],
  ["Northern Bobwhite","Colinus virginianus"],
  ["Scaled Quail","Callipepla squamata"],
  ["California Quail","Callipepla californica"],
  ["Gambel's Quail","Callipepla gambelii"],
  ["Montezuma Quail","Cyrtonyx montezumae"],
  ["Wild Turkey","Meleagris gallopavo"],
  ["Ruffed Grouse","Bonasa umbellus"],
  ["Spruce Grouse","Falcipennis canadensis"],
  ["Willow Ptarmigan","Lagopus lagopus"],
  ["Rock Ptarmigan","Lagopus muta"],
  ["White-tailed Ptarmigan","Lagopus leucura"],
  ["Greater Sage-Grouse","Centrocercus urophasianus"],
  ["Gunnison Sage-Grouse","Centrocercus minimus"],
  ["Dusky Grouse","Dendragapus obscurus"],
  ["Sooty Grouse","Dendragapus fuliginosus"],
  ["Sharp-tailed Grouse","Tympanuchus phasianellus"],
  ["Greater Prairie-Chicken","Tympanuchus cupido"],
  ["Lesser Prairie-Chicken","Tympanuchus pallidicinctus"],
  ["American Flamingo","Phoenicopterus ruber"],
  ["Least Grebe","Tachybaptus dominicus"],
  ["Pied-billed Grebe","Podilymbus podiceps"],
  ["Horned Grebe","Podiceps auritus"],
  ["Red-necked Grebe","Podiceps grisegena"],
  ["Eared Grebe","Podiceps nigricollis"],
  ["Western Grebe","Aechmophorus occidentalis"],
  ["Clark's Grebe","Aechmophorus clarkii"],
  ["White-crowned Pigeon","Patagioenas leucocephala"],
  ["Red-billed Pigeon","Patagioenas flavirostris"],
  ["Band-tailed Pigeon","Patagioenas fasciata"],
  ["Inca Dove","Columbina inca"],
  ["Common Ground Dove","Columbina passerina"],
  ["Ruddy Ground Dove","Columbina talpacoti"],
  ["White-tipped Dove","Leptotila verreauxi"],
  ["White-winged Dove","Zenaida asiatica"],
  ["Mourning Dove","Zenaida macroura"],
  ["Smooth-billed Ani","Crotophaga ani"],
  ["Groove-billed Ani","Crotophaga sulcirostris"],
  ["Greater Roadrunner","Geococcyx californianus"],
  ["Common Cuckoo","Cuculus canorus"],
  ["Yellow-billed Cuckoo","Coccyzus americanus"],
  ["Mangrove Cuckoo","Coccyzus minor"],
  ["Black-billed Cuckoo","Coccyzus erythropthalmus"],
  ["Lesser Nighthawk","Chordeiles acutipennis"],
  ["Common Nighthawk","Chordeiles minor"],
  ["Antillean Nighthawk","Chordeiles gundlachii"],
  ["Common Pauraque","Nyctidromus albicollis"],
  ["Common Poorwill","Phalaenoptilus nuttallii"],
  ["Chuck-will's-widow","Antrostomus carolinensis"],
  ["Buff-collared Nightjar","Antrostomus ridgwayi"],
  ["Eastern Whip-poor-will","Antrostomus vociferus"],
  ["Mexican Whip-poor-will","Antrostomus arizonae"],
  ["Black Swift","Cypseloides niger"],
  ["Chimney Swift","Chaetura pelagica"],
  ["Vaux's Swift","Chaetura vauxi"],
  ["Mariana Swiftlet","Aerodramus bartschi"],
  ["White-throated Swift","Aeronautes saxatalis"],
  ["Mexican Violetear","Colibri thalassinus"],
  ["Rivoli's Hummingbird","Eugenes fulgens"],
  ["Blue-throated Mountain-gem","Lampornis clemenciae"],
  ["Lucifer Hummingbird","Calothorax lucifer"],
  ["Ruby-throated Hummingbird","Archilochus colubris"],
  ["Black-chinned Hummingbird","Archilochus alexandri"],
  ["Anna's Hummingbird","Calypte anna"],
  ["Costa's Hummingbird","Calypte costae"],
  ["Calliope Hummingbird","Selasphorus calliope"],
  ["Rufous Hummingbird","Selasphorus rufus"],
  ["Allen's Hummingbird","Selasphorus sasin"],
  ["Broad-tailed Hummingbird","Selasphorus platycercus"],
  ["Broad-billed Hummingbird","Cynanthus latirostris"],
  ["White-eared Hummingbird","Basilinna leucotis"],
  ["Violet-crowned Hummingbird","Leucolia violiceps"],
  ["Berylline Hummingbird","Saucerottia beryllina"],
  ["Buff-bellied Hummingbird","Amazilia yucatanensis"],
  ["Ridgway's Rail","Rallus obsoletus"],
  ["Clapper Rail","Rallus crepitans"],
  ["King Rail","Rallus elegans"],
  ["Virginia Rail","Rallus limicola"],
  ["Sora","Porzana carolina"],
  ["Common Gallinule","Gallinula galeata"],
  ["Hawaiian Coot","Fulica alai"],
  ["American Coot","Fulica americana"],
  ["Purple Gallinule","Porphyrio martinicus"],
  ["Yellow Rail","Coturnicops noveboracensis"],
  ["Black Rail","Laterallus jamaicensis"],
  ["Limpkin","Aramus guarauna"],
  ["Sandhill Crane","Antigone canadensis"],
  ["Whooping Crane","Grus americana"],
  ["Black-necked Stilt","Himantopus mexicanus"],
  ["American Avocet","Recurvirostra americana"],
  ["American Oystercatcher","Haematopus palliatus"],
  ["Black Oystercatcher","Haematopus bachmani"],
  ["Black-bellied Plover","Pluvialis squatarola"],
  ["American Golden-Plover","Pluvialis dominica"],
  ["Pacific Golden-Plover","Pluvialis fulva"],
  ["Killdeer","Charadrius vociferus"],
  ["Common Ringed Plover","Charadrius hiaticula"],
  ["Semipalmated Plover","Charadrius semipalmatus"],
  ["Piping Plover","Charadrius melodus"],
  ["Lesser Sand-Plover","Charadrius mongolus"],
  ["Wilson's Plover","Charadrius wilsonia"],
  ["Mountain Plover","Charadrius montanus"],
  ["Snowy Plover","Charadrius nivosus"],
  ["Upland Sandpiper","Bartramia longicauda"],
  ["Bristle-thighed Curlew","Numenius tahitiensis"],
  ["Whimbrel","Numenius phaeopus"],
  ["Long-billed Curlew","Numenius americanus"],
  ["Bar-tailed Godwit","Limosa lapponica"],
  ["Black-tailed Godwit","Limosa limosa"],
  ["Hudsonian Godwit","Limosa haemastica"],
  ["Marbled Godwit","Limosa fedoa"],
  ["Ruddy Turnstone","Arenaria interpres"],
  ["Black Turnstone","Arenaria melanocephala"],
  ["Red Knot","Calidris canutus"],
  ["Surfbird","Calidris virgata"],
  ["Ruff","Calidris pugnax"],
  ["Sharp-tailed Sandpiper","Calidris acuminata"],
  ["Stilt Sandpiper","Calidris himantopus"],
  ["Curlew Sandpiper","Calidris ferruginea"],
  ["Temminck's Stint","Calidris temminckii"],
  ["Long-toed Stint","Calidris subminuta"],
  ["Red-necked Stint","Calidris ruficollis"],
  ["Sanderling","Calidris alba"],
  ["Dunlin","Calidris alpina"],
  ["Rock Sandpiper","Calidris ptilocnemis"],
  ["Purple Sandpiper","Calidris maritima"],
  ["Baird's Sandpiper","Calidris bairdii"],
  ["Least Sandpiper","Calidris minutilla"],
  ["White-rumped Sandpiper","Calidris fuscicollis"],
  ["Buff-breasted Sandpiper","Calidris subruficollis"],
  ["Pectoral Sandpiper","Calidris melanotos"],
  ["Semipalmated Sandpiper","Calidris pusilla"],
  ["Western Sandpiper","Calidris mauri"],
  ["Short-billed Dowitcher","Limnodromus griseus"],
  ["Long-billed Dowitcher","Limnodromus scolopaceus"],
  ["American Woodcock","Scolopax minor"],
  ["Common Snipe","Gallinago gallinago"],
  ["Wilson's Snipe","Gallinago delicata"],
  ["Terek Sandpiper","Xenus cinereus"],
  ["Common Sandpiper","Actitis hypoleucos"],
  ["Spotted Sandpiper","Actitis macularius"],
  ["Solitary Sandpiper","Tringa solitaria"],
  ["Gray-tailed Tattler","Tringa brevipes"],
  ["Wandering Tattler","Tringa incana"],
  ["Lesser Yellowlegs","Tringa flavipes"],
  ["Willet","Tringa semipalmata"],
  ["Common Greenshank","Tringa nebularia"],
  ["Greater Yellowlegs","Tringa melanoleuca"],
  ["Wood Sandpiper","Tringa glareola"],
  ["Wilson's Phalarope","Phalaropus tricolor"],
  ["Red-necked Phalarope","Phalaropus lobatus"],
  ["Red Phalarope","Phalaropus fulicarius"],
  ["Great Skua","Stercorarius skua"],
  ["South Polar Skua","Stercorarius maccormicki"],
  ["Pomarine Jaeger","Stercorarius pomarinus"],
  ["Parasitic Jaeger","Stercorarius parasiticus"],
  ["Long-tailed Jaeger","Stercorarius longicaudus"],
  ["Dovekie","Alle alle"],
  ["Common Murre","Uria aalge"],
  ["Thick-billed Murre","Uria lomvia"],
  ["Razorbill","Alca torda"],
  ["Black Guillemot","Cepphus grylle"],
  ["Pigeon Guillemot","Cepphus columba"],
  ["Long-billed Murrelet","Brachyramphus perdix"],
  ["Marbled Murrelet","Brachyramphus marmoratus"],
  ["Kittlitz's Murrelet","Brachyramphus brevirostris"],
  ["Scripps's Murrelet","Synthliboramphus scrippsi"],
  ["Guadalupe Murrelet","Synthliboramphus hypoleucus"],
  ["Craveri's Murrelet","Synthliboramphus craveri"],
  ["Ancient Murrelet","Synthliboramphus antiquus"],
  ["Cassin's Auklet","Ptychoramphus aleuticus"],
  ["Parakeet Auklet","Aethia psittacula"],
  ["Least Auklet","Aethia pusilla"],
  ["Whiskered Auklet","Aethia pygmaea"],
  ["Crested Auklet","Aethia cristatella"],
  ["Rhinoceros Auklet","Cerorhinca monocerata"],
  ["Atlantic Puffin","Fratercula arctica"],
  ["Horned Puffin","Fratercula corniculata"],
  ["Tufted Puffin","Fratercula cirrhata"],
  ["Black-legged Kittiwake","Rissa tridactyla"],
  ["Red-legged Kittiwake","Rissa brevirostris"],
  ["Ivory Gull","Pagophila eburnea"],
  ["Sabine's Gull","Xema sabini"],
  ["Bonaparte's Gull","Chroicocephalus philadelphia"],
  ["Black-headed Gull","Chroicocephalus ridibundus"],
  ["Little Gull","Hydrocoloeus minutus"],
  ["Ross's Gull","Rhodostethia rosea"],
  ["Laughing Gull","Leucophaeus atricilla"],
  ["Franklin's Gull","Leucophaeus pipixcan"],
  ["Heermann's Gull","Larus heermanni"],
  ["Mew Gull","Larus canus"],
  ["Ring-billed Gull","Larus delawarensis"],
  ["Western Gull","Larus occidentalis"],
  ["Yellow-footed Gull","Larus livens"],
  ["California Gull","Larus californicus"],
  ["Herring Gull","Larus argentatus"],
  ["Iceland Gull","Larus glaucoides"],
  ["Lesser Black-backed Gull","Larus fuscus"],
  ["Slaty-backed Gull","Larus schistisagus"],
  ["Glaucous-winged Gull","Larus glaucescens"],
  ["Glaucous Gull","Larus hyperboreus"],
  ["Great Black-backed Gull","Larus marinus"],
  ["Brown Noddy","Anous stolidus"],
  ["Black Noddy","Anous minutus"],
  ["Blue-gray Noddy","Anous ceruleus"],
  ["White Tern","Gygis alba"],
  ["Sooty Tern","Onychoprion fuscatus"],
  ["Gray-backed Tern","Onychoprion lunatus"],
  ["Bridled Tern","Onychoprion anaethetus"],
  ["Aleutian Tern","Onychoprion aleuticus"],
  ["Least Tern","Sternula antillarum"],
  ["Gull-billed Tern","Gelochelidon nilotica"],
  ["Caspian Tern","Hydroprogne caspia"],
  ["Black Tern","Chlidonias niger"],
  ["Roseate Tern","Sterna dougallii"],
  ["Common Tern","Sterna hirundo"],
  ["Arctic Tern","Sterna paradisaea"],
  ["Forster's Tern","Sterna forsteri"],
  ["Royal Tern","Thalasseus maximus"],
  ["Sandwich Tern","Thalasseus sandvicensis"],
  ["Elegant Tern","Thalasseus elegans"],
  ["Black Skimmer","Rynchops niger"],
  ["White-tailed Tropicbird","Phaethon lepturus"],
  ["Red-billed Tropicbird","Phaethon aethereus"],
  ["Red-tailed Tropicbird","Phaethon rubricauda"],
  ["Red-throated Loon","Gavia stellata"],
  ["Arctic Loon","Gavia arctica"],
  ["Pacific Loon","Gavia pacifica"],
  ["Common Loon","Gavia immer"],
  ["Yellow-billed Loon","Gavia adamsii"],
  ["Laysan Albatross","Phoebastria immutabilis"],
  ["Black-footed Albatross","Phoebastria nigripes"],
  ["Short-tailed Albatross","Phoebastria albatrus"],
  ["Wilson's Storm-Petrel","Oceanites oceanicus"],
  ["White-faced Storm-Petrel","Pelagodroma marina"],
  ["Fork-tailed Storm-Petrel","Hydrobates furcatus"],
  ["Leach's Storm-Petrel","Hydrobates leucorhous"],
  ["Townsend's Storm-Petrel","Hydrobates socorroensis"],
  ["Ashy Storm-Petrel","Hydrobates homochroa"],
  ["Band-rumped Storm-Petrel","Hydrobates castro"],
  ["Black Storm-Petrel","Hydrobates melania"],
  ["Tristram's Storm-Petrel","Hydrobates tristrami"],
  ["Least Storm-Petrel","Hydrobates microsoma"],
  ["Northern Fulmar","Fulmarus glacialis"],
  ["Trindade Petrel","Pterodroma arminjoniana"],
  ["Murphy's Petrel","Pterodroma ultima"],
  ["Mottled Petrel","Pterodroma inexpectata"],
  ["Bermuda Petrel","Pterodroma cahow"],
  ["Black-capped Petrel","Pterodroma hasitata"],
  ["Juan Fernandez Petrel","Pterodroma externa"],
  ["Hawaiian Petrel","Pterodroma sandwichensis"],
  ["White-necked Petrel","Pterodroma cervicalis"],
  ["Bonin Petrel","Pterodroma hypoleuca"],
  ["Black-winged Petrel","Pterodroma nigripennis"],
  ["Fea's Petrel","Pterodroma feae"],
  ["Cook's Petrel","Pterodroma cookii"],
  ["Bulwer's Petrel","Bulweria bulwerii"],
  ["Cory's Shearwater","Calonectris diomedea"],
  ["Wedge-tailed Shearwater","Ardenna pacifica"],
  ["Buller's Shearwater","Ardenna bulleri"],
  ["Short-tailed Shearwater","Ardenna tenuirostris"],
  ["Sooty Shearwater","Ardenna grisea"],
  ["Great Shearwater","Ardenna gravis"],
  ["Pink-footed Shearwater","Ardenna creatopus"],
  ["Flesh-footed Shearwater","Ardenna carneipes"],
  ["Christmas Shearwater","Puffinus nativitatis"],
  ["Manx Shearwater","Puffinus puffinus"],
  ["Newell's Shearwater","Puffinus newelli"],
  ["Black-vented Shearwater","Puffinus opisthomelas"],
  ["Audubon's Shearwater","Puffinus lherminieri"],
  ["Wood Stork","Mycteria americana"],
  ["Magnificent Frigatebird","Fregata magnificens"],
  ["Great Frigatebird","Fregata minor"],
  ["Masked Booby","Sula dactylatra"],
  ["Brown Booby","Sula leucogaster"],
  ["Red-footed Booby","Sula sula"],
  ["Northern Gannet","Morus bassanus"],
  ["Anhinga","Anhinga anhinga"],
  ["Brandt's Cormorant","Phalacrocorax penicillatus"],
  ["Red-faced Cormorant","Phalacrocorax urile"],
  ["Pelagic Cormorant","Phalacrocorax pelagicus"],
  ["Great Cormorant","Phalacrocorax carbo"],
  ["Double-crested Cormorant","Phalacrocorax auritus"],
  ["Neotropic Cormorant","Phalacrocorax brasilianus"],
  ["American White Pelican","Pelecanus erythrorhynchos"],
  ["Brown Pelican","Pelecanus occidentalis"],
  ["American Bittern","Botaurus lentiginosus"],
  ["Least Bittern","Ixobrychus exilis"],
  ["Great Blue Heron","Ardea herodias"],
  ["Great Egret","Ardea alba"],
  ["Snowy Egret","Egretta thula"],
  ["Little Blue Heron","Egretta caerulea"],
  ["Tricolored Heron","Egretta tricolor"],
  ["Reddish Egret","Egretta rufescens"],
  ["Cattle Egret","Bubulcus ibis"],
  ["Green Heron","Butorides virescens"],
  ["Black-crowned Night-Heron","Nycticorax nycticorax"],
  ["Yellow-crowned Night-Heron","Nyctanassa violacea"],
  ["White Ibis","Eudocimus albus"],
  ["Glossy Ibis","Plegadis falcinellus"],
  ["White-faced Ibis","Plegadis chihi"],
  ["Roseate Spoonbill","Platalea ajaja"],
  ["California Condor","Gymnogyps californianus"],
  ["Black Vulture","Coragyps atratus"],
  ["Turkey Vulture","Cathartes aura"],
  ["Osprey","Pandion haliaetus"],
  ["White-tailed Kite","Elanus leucurus"],
  ["Hook-billed Kite","Chondrohierax uncinatus"],
  ["Swallow-tailed Kite","Elanoides forficatus"],
  ["Golden Eagle","Aquila chrysaetos"],
  ["Northern Harrier","Circus hudsonius"],
  ["Sharp-shinned Hawk","Accipiter striatus"],
  ["Cooper's Hawk","Accipiter cooperii"],
  ["Northern Goshawk","Accipiter gentilis"],
  ["Bald Eagle","Haliaeetus leucocephalus"],
  ["Mississippi Kite","Ictinia mississippiensis"],
  ["Snail Kite","Rostrhamus sociabilis"],
  ["Common Black Hawk","Buteogallus anthracinus"],
  ["Harris's Hawk","Parabuteo unicinctus"],
  ["White-tailed Hawk","Geranoaetus albicaudatus"],
  ["Gray Hawk","Buteo plagiatus"],
  ["Red-shouldered Hawk","Buteo lineatus"],
  ["Broad-winged Hawk","Buteo platypterus"],
  ["Hawaiian Hawk","Buteo solitarius"],
  ["Short-tailed Hawk","Buteo brachyurus"],
  ["Swainson's Hawk","Buteo swainsoni"],
  ["Zone-tailed Hawk","Buteo albonotatus"],
  ["Red-tailed Hawk","Buteo jamaicensis"],
  ["Rough-legged Hawk","Buteo lagopus"],
  ["Ferruginous Hawk","Buteo regalis"],
  ["Barn Owl","Tyto alba"],
  ["Flammulated Owl","Psiloscops flammeolus"],
  ["Whiskered Screech-Owl","Megascops trichopsis"],
  ["Western Screech-Owl","Megascops kennicottii"],
  ["Eastern Screech-Owl","Megascops asio"],
  ["Great Horned Owl","Bubo virginianus"],
  ["Snowy Owl","Bubo scandiacus"],
  ["Northern Hawk Owl","Surnia ulula"],
  ["Northern Pygmy-Owl","Glaucidium gnoma"],
  ["Ferruginous Pygmy-Owl","Glaucidium brasilianum"],
  ["Elf Owl","Micrathene whitneyi"],
  ["Burrowing Owl","Athene cunicularia"],
  ["Spotted Owl","Strix occidentalis"],
  ["Barred Owl","Strix varia"],
  ["Great Gray Owl","Strix nebulosa"],
  ["Long-eared Owl","Asio otus"],
  ["Short-eared Owl","Asio flammeus"],
  ["Boreal Owl","Aegolius funereus"],
  ["Northern Saw-whet Owl","Aegolius acadicus"],
  ["Elegant Trogon","Trogon elegans"],
  ["Ringed Kingfisher","Megaceryle torquata"],
  ["Belted Kingfisher","Megaceryle alcyon"],
  ["Green Kingfisher","Chloroceryle americana"],
  ["Lewis's Woodpecker","Melanerpes lewis"],
  ["Red-headed Woodpecker","Melanerpes erythrocephalus"],
  ["Acorn Woodpecker","Melanerpes formicivorus"],
  ["Gila Woodpecker","Melanerpes uropygialis"],
  ["Golden-fronted Woodpecker","Melanerpes aurifrons"],
  ["Red-bellied Woodpecker","Melanerpes carolinus"],
  ["Williamson's Sapsucker","Sphyrapicus thyroideus"],
  ["Yellow-bellied Sapsucker","Sphyrapicus varius"],
  ["Red-naped Sapsucker","Sphyrapicus nuchalis"],
  ["Red-breasted Sapsucker","Sphyrapicus ruber"],
  ["American Three-toed Woodpecker","Picoides dorsalis"],
  ["Black-backed Woodpecker","Picoides arcticus"],
  ["Downy Woodpecker","Dryobates pubescens"],
  ["Nuttall's Woodpecker","Dryobates nuttallii"],
  ["Ladder-backed Woodpecker","Dryobates scalaris"],
  ["Red-cockaded Woodpecker","Dryobates borealis"],
  ["Hairy Woodpecker","Dryobates villosus"],
  ["White-headed Woodpecker","Dryobates albolarvatus"],
  ["Arizona Woodpecker","Dryobates arizonae"],
  ["Northern Flicker","Colaptes auratus"],
  ["Gilded Flicker","Colaptes chrysoides"],
  ["Pileated Woodpecker","Dryocopus pileatus"],
  ["Crested Caracara","Caracara cheriway"],
  ["American Kestrel","Falco sparverius"],
  ["Merlin","Falco columbarius"],
  ["Aplomado Falcon","Falco femoralis"],
  ["Gyrfalcon","Falco rusticolus"],
  ["Peregrine Falcon","Falco peregrinus"],
  ["Prairie Falcon","Falco mexicanus"],
  ["Rose-throated Becard","Pachyramphus aglaiae"],
  ["Northern Beardless-Tyrannulet","Camptostoma imberbe"],
  ["Dusky-capped Flycatcher","Myiarchus tuberculifer"],
  ["Ash-throated Flycatcher","Myiarchus cinerascens"],
  ["Great Crested Flycatcher","Myiarchus crinitus"],
  ["Brown-crested Flycatcher","Myiarchus tyrannulus"],
  ["La Sagra's Flycatcher","Myiarchus sagrae"],
  ["Great Kiskadee","Pitangus sulphuratus"],
  ["Sulphur-bellied Flycatcher","Myiodynastes luteiventris"],
  ["Tropical Kingbird","Tyrannus melancholicus"],
  ["Couch's Kingbird","Tyrannus couchii"],
  ["Cassin's Kingbird","Tyrannus vociferans"],
  ["Thick-billed Kingbird","Tyrannus crassirostris"],
  ["Western Kingbird","Tyrannus verticalis"],
  ["Eastern Kingbird","Tyrannus tyrannus"],
  ["Gray Kingbird","Tyrannus dominicensis"],
  ["Scissor-tailed Flycatcher","Tyrannus forficatus"],
  ["Fork-tailed Flycatcher","Tyrannus savana"],
  ["Olive-sided Flycatcher","Contopus cooperi"],
  ["Greater Pewee","Contopus pertinax"],
  ["Western Wood-Pewee","Contopus sordidulus"],
  ["Eastern Wood-Pewee","Contopus virens"],
  ["Yellow-bellied Flycatcher","Empidonax flaviventris"],
  ["Acadian Flycatcher","Empidonax virescens"],
  ["Alder Flycatcher","Empidonax alnorum"],
  ["Willow Flycatcher","Empidonax traillii"],
  ["Least Flycatcher","Empidonax minimus"],
  ["Hammond's Flycatcher","Empidonax hammondii"],
  ["Gray Flycatcher","Empidonax wrightii"],
  ["Dusky Flycatcher","Empidonax oberholseri"],
  ["Pacific-slope Flycatcher","Empidonax difficilis"],
  ["Cordilleran Flycatcher","Empidonax occidentalis"],
  ["Buff-breasted Flycatcher","Empidonax fulvifrons"],
  ["Black Phoebe","Sayornis nigricans"],
  ["Eastern Phoebe","Sayornis phoebe"],
  ["Say's Phoebe","Sayornis saya"],
  ["Vermilion Flycatcher","Pyrocephalus rubinus"],
  ["Loggerhead Shrike","Lanius ludovicianus"],
  ["Northern Shrike","Lanius borealis"],
  ["Black-capped Vireo","Vireo atricapilla"],
  ["White-eyed Vireo","Vireo griseus"],
  ["Bell's Vireo","Vireo bellii"],
  ["Gray Vireo","Vireo vicinior"],
  ["Hutton's Vireo","Vireo huttoni"],
  ["Yellow-throated Vireo","Vireo flavifrons"],
  ["Cassin's Vireo","Vireo cassinii"],
  ["Blue-headed Vireo","Vireo solitarius"],
  ["Plumbeous Vireo","Vireo plumbeus"],
  ["Philadelphia Vireo","Vireo philadelphicus"],
  ["Warbling Vireo","Vireo gilvus"],
  ["Red-eyed Vireo","Vireo olivaceus"],
  ["Yellow-green Vireo","Vireo flavoviridis"],
  ["Black-whiskered Vireo","Vireo altiloquus"],
  ["Canada Jay","Perisoreus canadensis"],
  ["Green Jay","Cyanocorax yncas"],
  ["Pinyon Jay","Gymnorhinus cyanocephalus"],
  ["Steller's Jay","Cyanocitta stelleri"],
  ["Blue Jay","Cyanocitta cristata"],
  ["Florida Scrub-Jay","Aphelocoma coerulescens"],
  ["Island Scrub-Jay","Aphelocoma insularis"],
  ["California Scrub-Jay","Aphelocoma californica"],
  ["Woodhouse's Scrub-Jay","Aphelocoma woodhouseii"],
  ["Mexican Jay","Aphelocoma wollweberi"],
  ["Clark's Nutcracker","Nucifraga columbiana"],
  ["Black-billed Magpie","Pica hudsonia"],
  ["Yellow-billed Magpie","Pica nuttalli"],
  ["American Crow","Corvus brachyrhynchos"],
  ["Fish Crow","Corvus ossifragus"],
  ["Chihuahuan Raven","Corvus cryptoleucus"],
  ["Common Raven","Corvus corax"],
  ["Kauai Elepaio","Chasiempis sclateri"],
  ["Oahu Elepaio","Chasiempis ibidis"],
  ["Hawaii Elepaio","Chasiempis sandwichensis"],
  ["Horned Lark","Eremophila alpestris"],
  ["Bank Swallow","Riparia riparia"],
  ["Tree Swallow","Tachycineta bicolor"],
  ["Violet-green Swallow","Tachycineta thalassina"],
  ["Northern Rough-winged Swallow","Stelgidopteryx serripennis"],
  ["Purple Martin","Progne subis"],
  ["Barn Swallow","Hirundo rustica"],
  ["Cliff Swallow","Petrochelidon pyrrhonota"],
  ["Cave Swallow","Petrochelidon fulva"],
  ["Carolina Chickadee","Poecile carolinensis"],
  ["Black-capped Chickadee","Poecile atricapillus"],
  ["Mountain Chickadee","Poecile gambeli"],
  ["Mexican Chickadee","Poecile sclateri"],
  ["Chestnut-backed Chickadee","Poecile rufescens"],
  ["Boreal Chickadee","Poecile hudsonicus"],
  ["Gray-headed Chickadee","Poecile cinctus"],
  ["Bridled Titmouse","Baeolophus wollweberi"],
  ["Oak Titmouse","Baeolophus inornatus"],
  ["Juniper Titmouse","Baeolophus ridgwayi"],
  ["Tufted Titmouse","Baeolophus bicolor"],
  ["Black-crested Titmouse","Baeolophus atricristatus"],
  ["Verdin","Auriparus flaviceps"],
  ["Bushtit","Psaltriparus minimus"],
  ["Red-breasted Nuthatch","Sitta canadensis"],
  ["White-breasted Nuthatch","Sitta carolinensis"],
  ["Pygmy Nuthatch","Sitta pygmaea"],
  ["Brown-headed Nuthatch","Sitta pusilla"],
  ["Brown Creeper","Certhia americana"],
  ["Rock Wren","Salpinctes obsoletus"],
  ["Canyon Wren","Catherpes mexicanus"],
  ["House Wren","Troglodytes aedon"],
  ["Pacific Wren","Troglodytes pacificus"],
  ["Winter Wren","Troglodytes hiemalis"],
  ["Sedge Wren","Cistothorus platensis"],
  ["Marsh Wren","Cistothorus palustris"],
  ["Carolina Wren","Thryothorus ludovicianus"],
  ["Bewick's Wren","Thryomanes bewickii"],
  ["Cactus Wren","Campylorhynchus brunneicapillus"],
  ["Blue-gray Gnatcatcher","Polioptila caerulea"],
  ["California Gnatcatcher","Polioptila californica"],
  ["Black-tailed Gnatcatcher","Polioptila melanura"],
  ["Black-capped Gnatcatcher","Polioptila nigriceps"],
  ["American Dipper","Cinclus mexicanus"],
  ["Golden-crowned Kinglet","Regulus satrapa"],
  ["Ruby-crowned Kinglet","Regulus calendula"],
  ["Arctic Warbler","Phylloscopus borealis"],
  ["Wrentit","Chamaea fasciata"],
  ["Millerbird","Acrocephalus familiaris"],
  ["Bluethroat","Cyanecula svecica"],
  ["Siberian Rubythroat","Calliope calliope"],
  ["Northern Wheatear","Oenanthe oenanthe"],
  ["Eastern Bluebird","Sialia sialis"],
  ["Western Bluebird","Sialia mexicana"],
  ["Mountain Bluebird","Sialia currucoides"],
  ["Townsend's Solitaire","Myadestes townsendi"],
  ["Omao","Myadestes obscurus"],
  ["Puaiohi","Myadestes palmeri"],
  ["Veery","Catharus fuscescens"],
  ["Gray-cheeked Thrush","Catharus minimus"],
  ["Bicknell's Thrush","Catharus bicknelli"],
  ["Swainson's Thrush","Catharus ustulatus"],
  ["Hermit Thrush","Catharus guttatus"],
  ["Wood Thrush","Hylocichla mustelina"],
  ["Eyebrowed Thrush","Turdus obscurus"],
  ["Clay-colored Thrush","Turdus grayi"],
  ["Rufous-backed Robin","Turdus rufopalliatus"],
  ["American Robin","Turdus migratorius"],
  ["Varied Thrush","Ixoreus naevius"],
  ["Gray Catbird","Dumetella carolinensis"],
  ["Curve-billed Thrasher","Toxostoma curvirostre"],
  ["Brown Thrasher","Toxostoma rufum"],
  ["Long-billed Thrasher","Toxostoma longirostre"],
  ["Bendire's Thrasher","Toxostoma bendirei"],
  ["California Thrasher","Toxostoma redivivum"],
  ["LeConte's Thrasher","Toxostoma lecontei"],
  ["Crissal Thrasher","Toxostoma crissale"],
  ["Sage Thrasher","Oreoscoptes montanus"],
  ["Northern Mockingbird","Mimus polyglottos"],
  ["Bohemian Waxwing","Bombycilla garrulus"],
  ["Cedar Waxwing","Bombycilla cedrorum"],
  ["Phainopepla","Phainopepla nitens"],
  ["Olive Warbler","Peucedramus taeniatus"],
  ["Eastern Yellow Wagtail","Motacilla tschutschensis"],
  ["White Wagtail","Motacilla alba"],
  ["Olive-backed Pipit","Anthus hodgsoni"],
  ["Red-throated Pipit","Anthus cervinus"],
  ["American Pipit","Anthus rubescens"],
  ["Sprague's Pipit","Anthus spragueii"],
  ["Brambling","Fringilla montifringilla"],
  ["Evening Grosbeak","Coccothraustes vespertinus"],
  ["Akikiki","Oreomystis bairdi"],
  ["Maui Alauahio","Paroreomyza montana"],
  ["Palila","Loxioides bailleui"],
  ["Laysan Finch","Telespiza cantans"],
  ["Nihoa Finch","Telespiza ultima"],
  ["Akohekohe","Palmeria dolei"],
  ["Apapane","Himatione sanguinea"],
  ["Iiwi","Drepanis coccinea"],
  ["Maui Parrotbill","Pseudonestor xanthophrys"],
  ["Akiapolaau","Hemignathus wilsoni"],
  ["Anianiau","Magumma parva"],
  ["Hawaii Amakihi","Chlorodrepanis virens"],
  ["Oahu Amakihi","Chlorodrepanis flava"],
  ["Kauai Amakihi","Chlorodrepanis stejnegeri"],
  ["Hawaii Creeper","Loxops mana"],
  ["Akekee","Loxops caeruleirostris"],
  ["Hawaii Akepa","Loxops coccineus"],
  ["Pine Grosbeak","Pinicola enucleator"],
  ["Gray-crowned Rosy-Finch","Leucosticte tephrocotis"],
  ["Black Rosy-Finch","Leucosticte atrata"],
  ["Brown-capped Rosy-Finch","Leucosticte australis"],
  ["House Finch","Haemorhous mexicanus"],
  ["Purple Finch","Haemorhous purpureus"],
  ["Cassin's Finch","Haemorhous cassinii"],
  ["Common Redpoll","Acanthis flammea"],
  ["Hoary Redpoll","Acanthis hornemanni"],
  ["Red Crossbill","Loxia curvirostra"],
  ["Cassia Crossbill","Loxia sinesciuris"],
  ["White-winged Crossbill","Loxia leucoptera"],
  ["Pine Siskin","Spinus pinus"],
  ["Lesser Goldfinch","Spinus psaltria"],
  ["Lawrence's Goldfinch","Spinus lawrencei"],
  ["American Goldfinch","Spinus tristis"],
  ["Lapland Longspur","Calcarius lapponicus"],
  ["Chestnut-collared Longspur","Calcarius ornatus"],
  ["Smith's Longspur","Calcarius pictus"],
  ["Thick-billed Longspur","Rhynchophanes mccownii"],
  ["Snow Bunting","Plectrophenax nivalis"],
  ["McKay's Bunting","Plectrophenax hyperboreus"],
  ["Rustic Bunting","Emberiza rustica"],
  ["Rufous-winged Sparrow","Peucaea carpalis"],
  ["Botteri's Sparrow","Peucaea botterii"],
  ["Cassin's Sparrow","Peucaea cassinii"],
  ["Bachman's Sparrow","Peucaea aestivalis"],
  ["Grasshopper Sparrow","Ammodramus savannarum"],
  ["Olive Sparrow","Arremonops rufivirgatus"],
  ["Five-striped Sparrow","Amphispiza quinquestriata"],
  ["Black-throated Sparrow","Amphispiza bilineata"],
  ["Lark Sparrow","Chondestes grammacus"],
  ["Lark Bunting","Calamospiza melanocorys"],
  ["Chipping Sparrow","Spizella passerina"],
  ["Clay-colored Sparrow","Spizella pallida"],
  ["Black-chinned Sparrow","Spizella atrogularis"],
  ["Field Sparrow","Spizella pusilla"],
  ["Brewer's Sparrow","Spizella breweri"],
  ["Fox Sparrow","Passerella iliaca"],
  ["American Tree Sparrow","Spizelloides arborea"],
  ["Dark-eyed Junco","Junco hyemalis"],
  ["Yellow-eyed Junco","Junco phaeonotus"],
  ["White-crowned Sparrow","Zonotrichia leucophrys"],
  ["Golden-crowned Sparrow","Zonotrichia atricapilla"],
  ["Harris's Sparrow","Zonotrichia querula"],
  ["White-throated Sparrow","Zonotrichia albicollis"],
  ["Sagebrush Sparrow","Artemisiospiza nevadensis"],
  ["Bell's Sparrow","Artemisiospiza belli"],
  ["Vesper Sparrow","Pooecetes gramineus"],
  ["LeConte's Sparrow","Ammospiza leconteii"],
  ["Seaside Sparrow","Ammospiza maritima"],
  ["Nelson's Sparrow","Ammospiza nelsoni"],
  ["Saltmarsh Sparrow","Ammospiza caudacuta"],
  ["Baird's Sparrow","Centronyx bairdii"],
  ["Henslow's Sparrow","Centronyx henslowii"],
  ["Savannah Sparrow","Passerculus sandwichensis"],
  ["Song Sparrow","Melospiza melodia"],
  ["Lincoln's Sparrow","Melospiza lincolnii"],
  ["Swamp Sparrow","Melospiza georgiana"],
  ["Canyon Towhee","Melozone fusca"],
  ["Abert's Towhee","Melozone aberti"],
  ["California Towhee","Melozone crissalis"],
  ["Rufous-crowned Sparrow","Aimophila ruficeps"],
  ["Green-tailed Towhee","Pipilo chlorurus"],
  ["Spotted Towhee","Pipilo maculatus"],
  ["Eastern Towhee","Pipilo erythrophthalmus"],
  ["Western Spindalis","Spindalis zena"],
  ["Yellow-breasted Chat","Icteria virens"],
  ["Yellow-headed Blackbird","Xanthocephalus xanthocephalus"],
  ["Bobolink","Dolichonyx oryzivorus"],
  ["Eastern Meadowlark","Sturnella magna"],
  ["Western Meadowlark","Sturnella neglecta"],
  ["Orchard Oriole","Icterus spurius"],
  ["Hooded Oriole","Icterus cucullatus"],
  ["Bullock's Oriole","Icterus bullockii"],
  ["Altamira Oriole","Icterus gularis"],
  ["Audubon's Oriole","Icterus graduacauda"],
  ["Baltimore Oriole","Icterus galbula"],
  ["Scott's Oriole","Icterus parisorum"],
  ["Red-winged Blackbird","Agelaius phoeniceus"],
  ["Tricolored Blackbird","Agelaius tricolor"],
  ["Shiny Cowbird","Molothrus bonariensis"],
  ["Bronzed Cowbird","Molothrus aeneus"],
  ["Brown-headed Cowbird","Molothrus ater"],
  ["Rusty Blackbird","Euphagus carolinus"],
  ["Brewer's Blackbird","Euphagus cyanocephalus"],
  ["Common Grackle","Quiscalus quiscula"],
  ["Boat-tailed Grackle","Quiscalus major"],
  ["Great-tailed Grackle","Quiscalus mexicanus"],
  ["Ovenbird","Seiurus aurocapilla"],
  ["Worm-eating Warbler","Helmitheros vermivorum"],
  ["Louisiana Waterthrush","Parkesia motacilla"],
  ["Northern Waterthrush","Parkesia noveboracensis"],
  ["Golden-winged Warbler","Vermivora chrysoptera"],
  ["Blue-winged Warbler","Vermivora cyanoptera"],
  ["Black-and-white Warbler","Mniotilta varia"],
  ["Prothonotary Warbler","Protonotaria citrea"],
  ["Swainson's Warbler","Limnothlypis swainsonii"],
  ["Tennessee Warbler","Leiothlypis peregrina"],
  ["Orange-crowned Warbler","Leiothlypis celata"],
  ["Colima Warbler","Leiothlypis crissalis"],
  ["Lucy's Warbler","Leiothlypis luciae"],
  ["Nashville Warbler","Leiothlypis ruficapilla"],
  ["Virginia's Warbler","Leiothlypis virginiae"],
  ["Connecticut Warbler","Oporornis agilis"],
  ["MacGillivray's Warbler","Geothlypis tolmiei"],
  ["Mourning Warbler","Geothlypis philadelphia"],
  ["Kentucky Warbler","Geothlypis formosa"],
  ["Common Yellowthroat","Geothlypis trichas"],
  ["Hooded Warbler","Setophaga citrina"],
  ["American Redstart","Setophaga ruticilla"],
  ["Kirtland's Warbler","Setophaga kirtlandii"],
  ["Cape May Warbler","Setophaga tigrina"],
  ["Cerulean Warbler","Setophaga cerulea"],
  ["Northern Parula","Setophaga americana"],
  ["Tropical Parula","Setophaga pitiayumi"],
  ["Magnolia Warbler","Setophaga magnolia"],
  ["Bay-breasted Warbler","Setophaga castanea"],
  ["Blackburnian Warbler","Setophaga fusca"],
  ["Yellow Warbler","Setophaga petechia"],
  ["Chestnut-sided Warbler","Setophaga pensylvanica"],
  ["Blackpoll Warbler","Setophaga striata"],
  ["Black-throated Blue Warbler","Setophaga caerulescens"],
  ["Palm Warbler","Setophaga palmarum"],
  ["Pine Warbler","Setophaga pinus"],
  ["Yellow-rumped Warbler","Setophaga coronata"],
  ["Yellow-throated Warbler","Setophaga dominica"],
  ["Prairie Warbler","Setophaga discolor"],
  ["Grace's Warbler","Setophaga graciae"],
  ["Black-throated Gray Warbler","Setophaga nigrescens"],
  ["Townsend's Warbler","Setophaga townsendi"],
  ["Hermit Warbler","Setophaga occidentalis"],
  ["Golden-cheeked Warbler","Setophaga chrysoparia"],
  ["Black-throated Green Warbler","Setophaga virens"],
  ["Rufous-capped Warbler","Basileuterus rufifrons"],
  ["Canada Warbler","Cardellina canadensis"],
  ["Wilson's Warbler","Cardellina pusilla"],
  ["Red-faced Warbler","Cardellina rubrifrons"],
  ["Painted Redstart","Myioborus pictus"],
  ["Hepatic Tanager","Piranga flava"],
  ["Summer Tanager","Piranga rubra"],
  ["Scarlet Tanager","Piranga olivacea"],
  ["Western Tanager","Piranga ludoviciana"],
  ["Flame-colored Tanager","Piranga bidentata"],
  ["Northern Cardinal","Cardinalis cardinalis"],
  ["Pyrrhuloxia","Cardinalis sinuatus"],
  ["Rose-breasted Grosbeak","Pheucticus ludovicianus"],
  ["Black-headed Grosbeak","Pheucticus melanocephalus"],
  ["Blue Grosbeak","Passerina caerulea"],
  ["Lazuli Bunting","Passerina amoena"],
  ["Indigo Bunting","Passerina cyanea"],
  ["Varied Bunting","Passerina versicolor"],
  ["Painted Bunting","Passerina ciris"],
  ["Dickcissel","Spiza americana"],
  ["Morelet's Seedeater","Sporophila morelleti"],
];

const TOTAL = NATIVE_SPECIES.length;
const NATIVE_SCI = new Set(NATIVE_SPECIES.map(([, s]) => s));

// Family boundaries — each entry: [first_sci_name_in_family, family_display_name].
// In ABA taxonomic order; species inherit the most-recent boundary's family.
const FAMILY_BOUNDARIES = [
  ["Dendrocygna autumnalis","Ducks, Geese & Swans"],
  ["Ortalis vetula","Chachalacas"],
  ["Oreortyx pictus","New World Quail"],
  ["Meleagris gallopavo","Grouse & Turkeys"],
  ["Phoenicopterus ruber","Flamingos"],
  ["Tachybaptus dominicus","Grebes"],
  ["Patagioenas leucocephala","Pigeons & Doves"],
  ["Crotophaga ani","Cuckoos, Roadrunners & Anis"],
  ["Chordeiles acutipennis","Nightjars"],
  ["Cypseloides niger","Swifts"],
  ["Colibri thalassinus","Hummingbirds"],
  ["Rallus obsoletus","Rails, Gallinules & Coots"],
  ["Aramus guarauna","Limpkin"],
  ["Antigone canadensis","Cranes"],
  ["Himantopus mexicanus","Stilts & Avocets"],
  ["Haematopus palliatus","Oystercatchers"],
  ["Pluvialis squatarola","Plovers"],
  ["Bartramia longicauda","Sandpipers & Phalaropes"],
  ["Stercorarius skua","Skuas & Jaegers"],
  ["Alle alle","Auks, Murres & Puffins"],
  ["Rissa tridactyla","Gulls, Terns & Skimmers"],
  ["Phaethon lepturus","Tropicbirds"],
  ["Gavia stellata","Loons"],
  ["Phoebastria immutabilis","Albatrosses"],
  ["Oceanites oceanicus","Southern Storm-Petrels"],
  ["Hydrobates furcatus","Northern Storm-Petrels"],
  ["Fulmarus glacialis","Shearwaters & Petrels"],
  ["Mycteria americana","Storks"],
  ["Fregata magnificens","Frigatebirds"],
  ["Sula dactylatra","Boobies & Gannets"],
  ["Anhinga anhinga","Anhingas"],
  ["Phalacrocorax penicillatus","Cormorants"],
  ["Pelecanus erythrorhynchos","Pelicans"],
  ["Botaurus lentiginosus","Herons, Egrets & Bitterns"],
  ["Eudocimus albus","Ibises & Spoonbills"],
  ["Gymnogyps californianus","New World Vultures"],
  ["Pandion haliaetus","Osprey"],
  ["Elanus leucurus","Hawks, Kites & Eagles"],
  ["Tyto alba","Barn Owls"],
  ["Psiloscops flammeolus","Typical Owls"],
  ["Trogon elegans","Trogons"],
  ["Megaceryle torquata","Kingfishers"],
  ["Melanerpes lewis","Woodpeckers"],
  ["Caracara cheriway","Caracaras & Falcons"],
  ["Pachyramphus aglaiae","Becards & Tityras"],
  ["Camptostoma imberbe","Tyrant Flycatchers"],
  ["Lanius ludovicianus","Shrikes"],
  ["Vireo atricapilla","Vireos"],
  ["Perisoreus canadensis","Jays, Crows & Magpies"],
  ["Chasiempis sclateri","Monarch Flycatchers"],
  ["Eremophila alpestris","Larks"],
  ["Riparia riparia","Swallows & Martins"],
  ["Poecile carolinensis","Chickadees & Titmice"],
  ["Auriparus flaviceps","Verdin"],
  ["Psaltriparus minimus","Bushtit"],
  ["Sitta canadensis","Nuthatches"],
  ["Certhia americana","Treecreepers"],
  ["Salpinctes obsoletus","Wrens"],
  ["Polioptila caerulea","Gnatcatchers"],
  ["Cinclus mexicanus","Dippers"],
  ["Regulus satrapa","Kinglets"],
  ["Phylloscopus borealis","Leaf Warblers"],
  ["Chamaea fasciata","Sylviid Warblers"],
  ["Acrocephalus familiaris","Reed Warblers"],
  ["Cyanecula svecica","Old World Flycatchers & Chats"],
  ["Sialia sialis","Thrushes"],
  ["Dumetella carolinensis","Mockingbirds & Thrashers"],
  ["Bombycilla garrulus","Waxwings"],
  ["Phainopepla nitens","Silky-flycatchers"],
  ["Peucedramus taeniatus","Olive Warbler"],
  ["Motacilla tschutschensis","Wagtails & Pipits"],
  ["Fringilla montifringilla","Finches & Hawaiian Honeycreepers"],
  ["Calcarius lapponicus","Longspurs & Snow Buntings"],
  ["Emberiza rustica","Old World Buntings"],
  ["Peucaea carpalis","New World Sparrows"],
  ["Spindalis zena","Spindalises"],
  ["Icteria virens","Yellow-breasted Chat"],
  ["Xanthocephalus xanthocephalus","Blackbirds & Orioles"],
  ["Seiurus aurocapilla","New World Warblers"],
  ["Piranga flava","Cardinals, Grosbeaks & Tanagers"],
  ["Sporophila morelleti","Tanagers & Seedeaters"],
];

// Build a sci -> family lookup by walking species in order, using boundaries.
const SCI_TO_FAMILY = (() => {
  const boundaryMap = new Map(FAMILY_BOUNDARIES);
  const out = new Map();
  let current = null;
  for (const [, sci] of NATIVE_SPECIES) {
    if (boundaryMap.has(sci)) current = boundaryMap.get(sci);
    out.set(sci, current);
  }
  return out;
})();

// ABA Code 3 scientific names — 'rare but annual' species within the 774.
// 101 species. Used to power the 'Rare bird finds' stat.
const CODE_3_SCI = new Set([
  "Anser fabalis",
  "Anser serrirostris",
  "Cygnus cygnus",
  "Anas laysanensis",
  "Aythya ferina",
  "Aythya fuligula",
  "Mergellus albellus",
  "Nomonyx dominicus",
  "Phoenicopterus ruber",
  "Columbina talpacoti",
  "Crotophaga ani",
  "Cuculus canorus",
  "Antrostomus ridgwayi",
  "Aerodramus bartschi",
  "Colibri thalassinus",
  "Basilinna leucotis",
  "Saucerottia beryllina",
  "Charadrius hiaticula",
  "Charadrius mongolus",
  "Limosa limosa",
  "Calidris pugnax",
  "Calidris acuminata",
  "Calidris ferruginea",
  "Calidris temminckii",
  "Calidris subminuta",
  "Calidris ruficollis",
  "Gallinago gallinago",
  "Xenus cinereus",
  "Actitis hypoleucos",
  "Tringa brevipes",
  "Tringa nebularia",
  "Stercorarius skua",
  "Brachyramphus perdix",
  "Synthliboramphus hypoleucus",
  "Synthliboramphus craveri",
  "Pagophila eburnea",
  "Rhodostethia rosea",
  "Larus livens",
  "Larus schistisagus",
  "Anous ceruleus",
  "Phaethon aethereus",
  "Phaethon rubricauda",
  "Phoebastria albatrus",
  "Pelagodroma marina",
  "Hydrobates socorroensis",
  "Hydrobates tristrami",
  "Hydrobates microsoma",
  "Pterodroma arminjoniana",
  "Pterodroma ultima",
  "Pterodroma cahow",
  "Pterodroma externa",
  "Pterodroma sandwichensis",
  "Pterodroma cervicalis",
  "Pterodroma hypoleuca",
  "Pterodroma nigripennis",
  "Pterodroma feae",
  "Pterodroma cookii",
  "Bulweria bulwerii",
  "Ardenna carneipes",
  "Puffinus nativitatis",
  "Puffinus newelli",
  "Fregata minor",
  "Sula dactylatra",
  "Chondrohierax uncinatus",
  "Glaucidium brasilianum",
  "Falco femoralis",
  "Pachyramphus aglaiae",
  "Myiarchus sagrae",
  "Tyrannus savana",
  "Vireo flavoviridis",
  "Chasiempis ibidis",
  "Poecile cinctus",
  "Polioptila nigriceps",
  "Acrocephalus familiaris",
  "Calliope calliope",
  "Myadestes palmeri",
  "Turdus obscurus",
  "Turdus rufopalliatus",
  "Motacilla alba",
  "Anthus hodgsoni",
  "Anthus cervinus",
  "Fringilla montifringilla",
  "Oreomystis bairdi",
  "Loxioides bailleui",
  "Telespiza cantans",
  "Telespiza ultima",
  "Palmeria dolei",
  "Pseudonestor xanthophrys",
  "Hemignathus wilsoni",
  "Loxops mana",
  "Loxops caeruleirostris",
  "Loxops coccineus",
  "Plectrophenax hyperboreus",
  "Emberiza rustica",
  "Amphispiza quinquestriata",
  "Spindalis zena",
  "Molothrus bonariensis",
  "Setophaga pitiayumi",
  "Basileuterus rufifrons",
  "Piranga bidentata",
  "Sporophila morelleti",
]);

// ---------- storage keys ----------
const STORAGE = {
  userCount: 'ebird:userCount',
  csvMeta: 'ebird:csvMeta',
  seenSci: 'ebird:seenSci',
  points: 'ebird:points',
};

// ---------- CSV parsing ----------
function parseEBirdCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          const sample = rows[0] || {};
          const stateKey = ['State/Province', 'State/Province ', 'State'].find(k => k in sample) || 'State/Province';
          const sciKey = ['Scientific Name'].find(k => k in sample) || 'Scientific Name';
          const comKey = ['Common Name'].find(k => k in sample) || 'Common Name';
          const dateKey = ['Date'].find(k => k in sample) || 'Date';
          const latKey = ['Latitude'].find(k => k in sample) || 'Latitude';
          const lngKey = ['Longitude'].find(k => k in sample) || 'Longitude';
          const locIdKey = ['Location ID'].find(k => k in sample) || 'Location ID';

          const usRows = rows.filter(r => {
            const s = r[stateKey];
            return s && typeof s === 'string' && s.startsWith('US-');
          });

          const isCountable = (sci, com) => {
            const name = (sci || com || '').trim();
            if (!name) return false;
            if (/\bsp\.\s*$/.test(name)) return false;
            if (name.includes('/')) return false;
            if (/\sx\s/i.test(name) || /\(hybrid\)/i.test(name)) return false;
            if (/\(.*domestic.*\)/i.test(name)) return false;
            return true;
          };

          const allSpecies = new Set();
          const nativeSci = new Set();
          // Group countable observations by location: locId -> { lng, lat, species: Set }
          const locations = new Map();
          let earliest = null, latest = null;
          let totalObservations = 0;

          for (const r of usRows) {
            totalObservations++;
            const sci = (r[sciKey] || '').trim();
            const com = r[comKey];
            if (isCountable(sci, com)) {
              const speciesKey = sci || com;
              allSpecies.add(speciesKey);
              if (sci && NATIVE_SCI.has(sci)) {
                nativeSci.add(sci);
              }
              const lat = parseFloat(r[latKey]);
              const lng = parseFloat(r[lngKey]);
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                // Prefer eBird's Location ID; fall back to coordinate key
                const locId = (r[locIdKey] && String(r[locIdKey]).trim()) ||
                              `${lng.toFixed(5)},${lat.toFixed(5)}`;
                let loc = locations.get(locId);
                if (!loc) {
                  loc = { lng, lat, species: new Set() };
                  locations.set(locId, loc);
                }
                loc.species.add(speciesKey);
              }
            }
            const dStr = r[dateKey];
            if (dStr) {
              const d = new Date(dStr);
              if (!isNaN(d)) {
                if (!earliest || d < earliest) earliest = d;
                if (!latest || d > latest) latest = d;
              }
            }
          }

          // Output: one tuple per unique location, [lng, lat, uniqueSpeciesCount]
          const points = [];
          for (const loc of locations.values()) {
            points.push([loc.lng, loc.lat, loc.species.size]);
          }

          resolve({
            count: nativeSci.size,
            allCount: allSpecies.size,
            seenSci: Array.from(nativeSci),
            points,
            meta: {
              observations: totalObservations,
              earliest: earliest ? earliest.toISOString() : null,
              latest: latest ? latest.toISOString() : null,
              fileName: file.name,
              updatedAt: new Date().toISOString(),
              allCount: allSpecies.size,
              locationCount: points.length,
            },
          });
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}

// ---------- formatting helpers ----------
const fmt = (n) => (n == null ? '—' : n.toLocaleString('en-US'));
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};
const relativeTime = (iso) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo > 1 ? 's' : ''} ago`;
};

// ---------- main component ----------
export default function BirdLifeTracker() {
  const [userCount, setUserCount] = useState(null);
  const [csvMeta, setCsvMeta] = useState(null);
  const [seenSci, setSeenSci] = useState(() => new Set());
  const [points, setPoints] = useState(null); // array of [lng, lat]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [progressAnim, setProgressAnim] = useState(0);
  const fileRef = useRef(null);

  // hydrate from storage
  useEffect(() => {
    (async () => {
      const [u, m, s, p] = await Promise.all([
        storage.get(STORAGE.userCount),
        storage.get(STORAGE.csvMeta),
        storage.get(STORAGE.seenSci),
        storage.get(STORAGE.points),
      ]);
      if (u) setUserCount(parseInt(u, 10));
      if (m) { try { setCsvMeta(JSON.parse(m)); } catch {} }
      if (s) { try { setSeenSci(new Set(JSON.parse(s))); } catch {} }
      if (p) { try { setPoints(JSON.parse(p)); } catch {} }
      setHydrated(true);
    })();
  }, []);

  // toast auto-dismiss
  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, 4000);
    return () => clearTimeout(t);
  }, [error, success]);

  // File Handling API: if the OS launches the app with a file (e.g. user taps a
  // .csv in their file manager), process it. Supported on Android Chrome and
  // desktop browsers; silently no-op on iOS Safari (which lacks the API).
  useEffect(() => {
    if (!('launchQueue' in window)) return;
    try {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams?.files?.length) return;
        for (const handle of launchParams.files) {
          try {
            const file = await handle.getFile();
            if (file && file.name.toLowerCase().endsWith('.csv')) {
              await onCsvFile(file);
              break;
            }
          } catch {}
        }
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // animate progress bar
  useEffect(() => {
    if (userCount == null) {
      setProgressAnim(0);
      return;
    }
    const target = Math.min(userCount / TOTAL, 1);
    let raf, start;
    const dur = 1400;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setProgressAnim(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [userCount]);

  async function onCsvFile(file) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { count, allCount, seenSci: nextSeen, points: nextPoints, meta } = await parseEBirdCsv(file);
      const seenSet = new Set(nextSeen);
      setUserCount(count);
      setCsvMeta(meta);
      setSeenSci(seenSet);
      setPoints(nextPoints);
      await storage.set(STORAGE.userCount, String(count));
      await storage.set(STORAGE.csvMeta, JSON.stringify(meta));
      await storage.set(STORAGE.seenSci, JSON.stringify(nextSeen));
      await storage.set(STORAGE.points, JSON.stringify(nextPoints));
      const extra = allCount - count;
      const extraNote = extra > 0 ? ` (${extra} non-native or rare visitor${extra === 1 ? '' : 's'} excluded)` : '';
      setSuccess(`Counted ${count.toLocaleString()} of ${TOTAL} native species${extraNote}.`);
    } catch (e) {
      setError("Couldn't read that file. Make sure it's the MyEBirdData.csv export from My eBird → Download My Data.");
    } finally {
      setLoading(false);
    }
  }

  async function resetAll() {
    if (!confirm('Clear stored data (count, sightings, CSV summary, map)?')) return;
    await Promise.all([
      storage.del(STORAGE.userCount),
      storage.del(STORAGE.csvMeta),
      storage.del(STORAGE.seenSci),
      storage.del(STORAGE.points),
    ]);
    setUserCount(null);
    setCsvMeta(null);
    setSeenSci(new Set());
    setPoints(null);
    setSuccess('Cleared.');
  }

  // Derived stats: unique families seen, and Code 3 rare finds.
  const familiesSeen = useMemo(() => {
    if (!seenSci || seenSci.size === 0) return 0;
    const fams = new Set();
    for (const sci of seenSci) {
      const f = SCI_TO_FAMILY.get(sci);
      if (f) fams.add(f);
    }
    return fams.size;
  }, [seenSci]);

  const code3Seen = useMemo(() => {
    if (!seenSci || seenSci.size === 0) return 0;
    let n = 0;
    for (const sci of seenSci) if (CODE_3_SCI.has(sci)) n++;
    return n;
  }, [seenSci]);

  const TOTAL_FAMILIES = FAMILY_BOUNDARIES.length;
  const TOTAL_CODE_3 = CODE_3_SCI.size;

  const pct = userCount != null ? (userCount / TOTAL) * 100 : null;
  const remaining = userCount != null ? TOTAL - userCount : null;
  const empty = hydrated && userCount == null;

  return (
    <div className="font-body min-h-screen w-full relative overflow-hidden" style={{
      background: '#0c1f1f',
      color: '#f5f5f4',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        /* Typography */
        .font-display { font-family: 'Montserrat', system-ui, sans-serif; letter-spacing: -0.025em; font-feature-settings: 'tnum' 1; }
        .font-body { font-family: 'Montserrat', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum' 1; }

        /* Text colors */
        .ink { color: #f5f5f4; }
        .ink-soft { color: #a8b1ae; }
        .ink-faint { color: #6b7773; }

        /* Accents (punchier) */
        .rust { color: #fb923c; }        /* warm orange — primary brand */
        .moss { color: #4ade80; }        /* emerald — seen/found indicator */
        .teal { color: #2dd4bf; }        /* secondary accent */

        /* Surfaces */
        .surface-1 { background: #142926; border: 1px solid rgba(255,255,255,0.06); }
        .surface-2 { background: #1c3531; border: 1px solid rgba(255,255,255,0.08); }
        .grain { /* parchment texture retired */ }

        /* Rules / dividers */
        .rule { border-color: rgba(255,255,255,0.10); }
        .rule-dashed { background-image: linear-gradient(to right, rgba(255,255,255,0.20) 50%, transparent 50%); background-size: 8px 1px; background-repeat: repeat-x; height: 1px; }

        /* Animations */
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .anim-1 { animation: fadeUp 0.5s 0.05s both ease-out; }
        .anim-2 { animation: fadeUp 0.5s 0.15s both ease-out; }
        .anim-3 { animation: fadeUp 0.5s 0.25s both ease-out; }
        .anim-4 { animation: fadeUp 0.5s 0.35s both ease-out; }
        .anim-5 { animation: fadeUp 0.5s 0.45s both ease-out; }
        .toast { animation: fadeIn 0.25s ease-out; }

        /* Pill / chip — was the rust 'stamp' */
        .stamp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(249, 115, 22, 0.10);
          color: #fb923c;
          font-family: 'Montserrat', system-ui, sans-serif;
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid rgba(249, 115, 22, 0.25);
          border-radius: 999px;
        }

        /* Buttons */
        .btn-ink { background: #f97316; color: #0c1f1f; font-weight: 600; transition: all 0.15s; }
        .btn-ink:hover { background: #fb923c; transform: translateY(-1px); }
        .btn-ink:disabled { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); cursor: not-allowed; transform: none; }
        .btn-ghost { background: rgba(255,255,255,0.04); color: #f5f5f4; border: 1px solid rgba(255,255,255,0.15); font-weight: 500; transition: all 0.15s; }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.30); }
        .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Inputs */
        .input-field { background: rgba(0,0,0,0.20); border: 1px solid rgba(255,255,255,0.12); color: #f5f5f4; }
        .input-field::placeholder { color: #6b7773; }
        .input-field:focus { outline: none; border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }

        /* Lists */
        .species-row { transition: background 0.12s; }
        .species-row:hover { background: rgba(255,255,255,0.04); }

        /* Subtle hover lift on cards */
        .lift { transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
        .lift:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.18); }
      `}</style>

      <div className="relative max-w-3xl mx-auto px-6 sm:px-10 py-8 sm:py-12">
        <header className="anim-1 flex items-center justify-between mb-10 sm:mb-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
              <Feather size={16} strokeWidth={2} className="rust" />
            </div>
            <div>
              <h1 className="font-display text-base sm:text-lg ink leading-none" style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
                CENSUS
              </h1>
              <p className="font-mono text-[9px] ink-faint tracking-[0.2em] uppercase mt-1">United States</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="btn-ghost rounded-full p-2.5"
            aria-label="Settings"
          >
            <Settings size={16} strokeWidth={2} />
          </button>
        </header>

        {empty && (
          <div className="anim-2">
            <div className="text-center mb-12">
              <div className="stamp mb-6">Get Started</div>
              <h2 className="font-display text-4xl sm:text-5xl ink mb-4 leading-[1.05]" style={{ fontWeight: 700 }}>
                How many of America's<br />
                <span className="rust">{TOTAL}</span> native birds<br />
                have you seen?
              </h2>
              <p className="ink-soft max-w-md mx-auto leading-relaxed">
                Upload your eBird data to find out. The denominator is fixed: every native,
                regularly-occurring bird species in the ABA Area, counted once.
              </p>
            </div>

            <div className="max-w-md mx-auto mb-6">
              <div className="surface-1 rounded-2xl p-6 relative">
                <div className="absolute top-4 right-4 font-mono text-[10px] ink-faint tracking-widest">CSV</div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(249,115,22,0.10)' }}>
                  <FileText size={20} strokeWidth={2} className="rust" />
                </div>
                <h3 className="font-display text-lg ink mb-2" style={{ fontWeight: 600 }}>Your sightings</h3>
                <p className="text-sm ink-soft mb-5 leading-relaxed">
                  At <span className="font-mono text-xs ink">ebird.org</span>: My eBird → Download My Data.
                  You'll be emailed a CSV — upload it here.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => onCsvFile(e.target.files?.[0])}
                />
                <button
                  className="btn-ink rounded-full px-5 py-2.5 text-sm flex items-center gap-2"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                  {loading ? 'Reading…' : 'Upload CSV'}
                </button>
              </div>
            </div>

            <div className="text-center text-xs ink-faint flex items-center justify-center gap-3 flex-wrap">
              <button onClick={() => setShowList(true)} className="hover:ink transition-colors">
                Browse the list of {TOTAL}
              </button>
              <span>·</span>
              <button onClick={() => setShowAbout(true)} className="hover:ink transition-colors">
                What's the {TOTAL}?
              </button>
              <span>·</span>
              <span>Stored locally</span>
            </div>
          </div>
        )}

        {!empty && hydrated && (
          <main>
            <div className="text-center mb-3 anim-2">
              <div className="font-mono text-[10px] ink-faint tracking-[0.3em] uppercase">Native Life List</div>
            </div>

            <div className="text-center mb-2 anim-2">
              <div
                className="font-display ink leading-none"
                style={{ fontSize: 'clamp(6.5rem, 20vw, 11rem)', fontWeight: 800, letterSpacing: '-0.04em' }}
              >
                {userCount != null ? fmt(userCount) : '—'}
              </div>
            </div>

            <div className="text-center mb-10 anim-3">
              <span className="font-display ink-soft" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '0.02em' }}>
                of {fmt(TOTAL)} species
              </span>
            </div>

            <div className="mb-3 anim-4">
              <div className="flex items-baseline justify-between mb-2.5">
                <span className="font-display rust" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {pct != null ? `${pct.toFixed(1)}%` : '—'}
                </span>
                <span className="text-xs ink-soft font-mono">
                  {remaining != null ? `${fmt(remaining)} to go` : ''}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${progressAnim * 100}%`,
                    background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
                    boxShadow: '0 0 12px rgba(249,115,22,0.4)',
                  }}
                />
              </div>
            </div>

            {/* View buttons */}
            <div className="mt-6 anim-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setShowList(true)}
                className="btn-ghost rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <List size={14} strokeWidth={2} />
                Browse all {TOTAL}
              </button>
              {points && points.length > 0 && (
                <button
                  onClick={() => setShowMap(true)}
                  className="btn-ghost rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
                >
                  <MapIcon size={14} strokeWidth={2} />
                  Sightings map
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-10 anim-5">
              <div className="surface-1 rounded-2xl p-4">
                <div className="font-mono text-[10px] ink-faint tracking-widest uppercase mb-2">Observations</div>
                <div className="font-display ink" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {csvMeta ? fmt(csvMeta.observations) : '—'}
                </div>
              </div>
              <div className="surface-1 rounded-2xl p-4">
                <div className="font-mono text-[10px] ink-faint tracking-widest uppercase mb-2">Families seen</div>
                <div className="font-display ink leading-none" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {familiesSeen}
                  <span className="ink-faint" style={{ fontSize: '0.7em', fontWeight: 500, marginLeft: '0.15em' }}>
                    / {TOTAL_FAMILIES}
                  </span>
                </div>
              </div>
              <div className="surface-1 rounded-2xl p-4">
                <div className="font-mono text-[10px] ink-faint tracking-widest uppercase mb-2">Rare bird finds</div>
                <div className="font-display ink leading-none" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {code3Seen}
                  <span className="ink-faint" style={{ fontSize: '0.7em', fontWeight: 500, marginLeft: '0.15em' }}>
                    / {TOTAL_CODE_3}
                  </span>
                </div>
                <div className="font-mono text-[9px] ink-faint tracking-wider mt-1">ABA Code 3</div>
              </div>
              <div className="surface-1 rounded-2xl p-4">
                <div className="font-mono text-[10px] ink-faint tracking-widest uppercase mb-2">First sighting</div>
                <div className="font-display ink" style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  {csvMeta?.earliest ? fmtDate(csvMeta.earliest) : '—'}
                </div>
              </div>
              <div className="surface-1 rounded-2xl p-4 col-span-2 sm:col-span-1">
                <div className="font-mono text-[10px] ink-faint tracking-widest uppercase mb-2">Latest entry</div>
                <div className="font-display ink" style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  {csvMeta?.latest ? fmtDate(csvMeta.latest) : '—'}
                </div>
              </div>
            </div>

            {csvMeta?.allCount != null && userCount != null && csvMeta.allCount > userCount && (
              <div className="mt-6 anim-5">
                <div className="text-xs ink-soft leading-relaxed">
                  Your CSV holds <span className="font-mono ink">{fmt(csvMeta.allCount)}</span> distinct US species in total
                  — <span className="font-mono ink">{fmt(csvMeta.allCount - userCount)}</span> are excluded from the count
                  as introduced exotics or rare visitors from other continents.
                </div>
              </div>
            )}

            <div className="mt-10 pt-6 border-t rule flex flex-wrap items-center justify-between gap-4 anim-5">
              <div className="font-mono text-[10px] ink-faint tracking-wider">
                <div>Updated <span className="ink-soft">{csvMeta ? relativeTime(csvMeta.updatedAt) : '—'}</span></div>
                <div className="mt-0.5">
                  <button onClick={() => setShowAbout(true)} className="ink-soft hover:ink transition-colors">about the {TOTAL}</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => onCsvFile(e.target.files?.[0])}
                />
                <button
                  className="btn-ghost rounded-full px-3.5 py-2 text-xs flex items-center gap-1.5"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
                  Re-upload CSV
                </button>
              </div>
            </div>
          </main>
        )}

        <footer className="mt-16 pt-6 border-t rule text-center anim-5">
          <p className="font-mono text-[9px] ink-faint tracking-[0.25em] uppercase leading-relaxed">
            Sightings · ebird (Cornell Lab of Ornithology)<br />
            Total · ABA Checklist v8.0.7
          </p>
        </footer>
      </div>

      {/* toasts */}
      {(error || success) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 toast z-50 max-w-md w-[90%]">
          <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl backdrop-blur-md ${error ? '' : ''}`}
               style={{
                 background: error ? 'rgba(127, 29, 29, 0.85)' : 'rgba(20, 83, 45, 0.85)',
                 border: `1px solid ${error ? 'rgba(248, 113, 113, 0.30)' : 'rgba(74, 222, 128, 0.30)'}`,
                 color: '#f5f5f4',
                 boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
               }}>
            {error ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <Check size={18} className="shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm leading-relaxed">{error || success}</div>
            <button onClick={() => { setError(null); setSuccess(null); }} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* species list drawer */}
      {showList && <SpeciesListDrawer seenSci={seenSci} onClose={() => setShowList(false)} />}

      {/* sightings map drawer */}
      {showMap && <SightingsMapDrawer points={points || []} onClose={() => setShowMap(false)} />}

      {/* settings drawer */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={() => setShowSettings(false)}>
          <div
            className="surface-2 rounded-2xl max-w-md w-full p-7 relative"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 ink-soft hover:ink transition-colors">
              <X size={18} />
            </button>
            <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Settings</div>
            <h2 className="font-display ink text-2xl mb-6" style={{ fontWeight: 700 }}>Configuration</h2>

            <label className="block mb-6">
              <span className="font-mono text-[10px] ink-faint tracking-widest uppercase block mb-2">Re-upload CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="text-xs ink-soft block w-full file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#f97316] file:text-[#0c1f1f] file:cursor-pointer hover:file:bg-[#fb923c]"
                onChange={(e) => onCsvFile(e.target.files?.[0])}
              />
              {csvMeta && (
                <span className="text-xs ink-faint mt-2 block">
                  Current: {csvMeta.fileName || 'data.csv'} · {fmt(csvMeta.observations)} obs · {relativeTime(csvMeta.updatedAt)}
                </span>
              )}
            </label>

            <div className="border-t rule my-6" />

            <div className="space-y-1">
              <button
                onClick={() => { setShowList(true); setShowSettings(false); }}
                className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
              >
                Browse all {TOTAL} species →
              </button>
              {points && points.length > 0 && (
                <button
                  onClick={() => { setShowMap(true); setShowSettings(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
                >
                  Sightings map →
                </button>
              )}
              <button
                onClick={() => { setShowAbout(true); setShowSettings(false); }}
                className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
              >
                About the {TOTAL} →
              </button>
            </div>

            <div className="border-t rule my-6" />

            <div className="flex items-center justify-between gap-3">
              <button onClick={resetAll} className="text-xs rust hover:underline">Clear all data</button>
              <button onClick={() => setShowSettings(false)} className="btn-ink rounded-full px-5 py-2 text-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* about drawer */}
      {showAbout && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAbout(false)}>
          <div
            className="surface-2 rounded-2xl max-w-lg w-full p-7 relative max-h-[85vh] overflow-y-auto"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 ink-soft hover:ink transition-colors">
              <X size={18} />
            </button>
            <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Methodology</div>
            <h2 className="font-display ink text-3xl mb-1" style={{ fontWeight: 700 }}>Why <span className="rust">{TOTAL}</span>?</h2>
            <p className="ink-soft text-sm mb-6">A derivation</p>

            <div className="text-sm ink-soft leading-relaxed space-y-3">
              <p>
                The starting point is the <span className="ink">ABA Checklist v8.0.7</span> — the American Birding
                Association's official catalogue of every species reliably documented in the ABA Area
                (lower 48, Alaska, Hawaii, Canada). Total: <span className="font-mono ink">1,120 species</span>.
              </p>
              <p>Each species is assigned a code 1–6 by the ABA Checklist Committee:</p>
              <div className="font-mono text-xs pl-2 space-y-1 my-3">
                <div><span className="rust">1–2</span> · regular breeders & visitors</div>
                <div><span className="rust">3</span> · rare but annual</div>
                <div className="ink-faint">4 · casual (less than annual) ← excluded</div>
                <div className="ink-faint">5 · accidental (very few records) ← excluded</div>
                <div className="ink-faint">6 · extinct or extirpated ← excluded</div>
              </div>
              <p>
                Codes 4 and 5 are where things like Steller's Sea-Eagle live — exciting finds, but
                not "America's birds" in any meaningful sense. Excluding them leaves <span className="font-mono ink">826</span>.
              </p>
              <p>
                Then the established exotics get pulled out — the <span className="font-mono ink">52</span> species
                on the ABA's separate Introduced Species list whose entire ABA-Area
                presence is non-native: House Sparrow, European Starling, Rock Pigeon, all the Hawaiian
                introductions, Eurasian Collared-Dove, naturalized parrots, and so on.
              </p>
              <p className="font-display py-2" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                <span className="font-mono ink">826 − 52 = </span>
                <span className="rust">{TOTAL}</span>
              </p>
              <p>
                Species native to the mainland US that were also introduced to Hawaii — Mallard, Wild
                Turkey, Northern Cardinal, House Finch, etc. — are kept, since they have legitimate
                native US populations. Cattle Egret stays (self-introduced naturally from Africa via South
                America). California Condor stays (native, reintroduced).
              </p>
              <p>
                Your uploaded CSV is filtered against this exact {TOTAL}-species list by scientific name, so
                rare vagrants and invasives you've recorded are noted but don't push the percentage above 100.
              </p>
              <div className="border-t rule my-4" />
              <p className="text-xs ink-faint">
                Sources:<br />
                <span className="font-mono">aba.org/aba-checklist</span><br />
                <span className="font-mono">aba.org/aba-area-introduced-species</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {!hydrated && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0c1f1f' }}>
          <div className="font-mono text-xs ink-faint tracking-widest animate-pulse">loading…</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Species list drawer — full 774-species list with checkbox states
// ============================================================================
function SpeciesListDrawer({ seenSci, onClose }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'seen' | 'unseen'

  // Filter species, then group consecutively by family.
  // Output is an array of { family, items: [[common, sci], ...] } in taxonomic order.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];
    let currentFamily = null;
    let currentGroup = null;

    for (const [common, sci] of NATIVE_SPECIES) {
      const seen = seenSci.has(sci);
      if (filter === 'seen' && !seen) continue;
      if (filter === 'unseen' && seen) continue;
      if (q && !common.toLowerCase().includes(q) && !sci.toLowerCase().includes(q)) continue;

      const fam = SCI_TO_FAMILY.get(sci) || 'Other';
      if (fam !== currentFamily) {
        currentFamily = fam;
        currentGroup = { family: fam, items: [] };
        result.push(currentGroup);
      }
      currentGroup.items.push([common, sci]);
    }
    return result;
  }, [query, filter, seenSci]);

  const totalShown = groups.reduce((n, g) => n + g.items.length, 0);
  const seenCount = seenSci.size;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="max-w-2xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#142926', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Species Index</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>The {TOTAL}</h2>
          <p className="ink-soft text-sm mb-4">
            <span className="moss font-mono" style={{ fontWeight: 600 }}>{seenCount}</span> recorded
            {' · '}
            <span className="ink-faint font-mono">{TOTAL - seenCount}</span> unseen
            {' · '}
            grouped by family
          </p>

          {/* filter pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {[
              ['all', `All ${TOTAL}`],
              ['seen', `Seen (${seenCount})`],
              ['unseen', `Unseen (${TOTAL - seenCount})`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  filter === key ? 'btn-ink' : 'btn-ghost'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 ink-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by common or scientific name…"
              className="input-field rounded-full pl-9 pr-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        {/* list body */}
        <div className="relative flex-1 overflow-y-auto px-2 sm:px-4 py-2">
          {groups.length === 0 ? (
            <div className="text-center py-12 ink-faint text-sm">
              No matches{query ? ` for "${query}"` : ''}.
            </div>
          ) : (
            <div className="font-body">
              {groups.map(({ family, items }) => {
                const famSeen = items.filter(([, s]) => seenSci.has(s)).length;
                return (
                  <section key={family} className="mb-1">
                    {/* family subheader */}
                    <div className="sticky top-0 z-10 px-3 py-2 flex items-baseline justify-between gap-3" style={{ background: 'rgba(20, 41, 38, 0.95)', backdropFilter: 'blur(8px)' }}>
                      <h3 className="font-display ink text-base sm:text-lg" style={{ fontWeight: 600 }}>
                        {family}
                      </h3>
                      <span
                        className="font-mono text-[11px] ink-soft tracking-wider whitespace-nowrap"
                        style={{ fontWeight: 600 }}
                      >
                        {famSeen} / {items.length}
                      </span>
                    </div>
                    <div className="border-t mx-3 mb-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                    <ul>
                      {items.map(([common, sci]) => {
                        const seen = seenSci.has(sci);
                        return (
                          <li
                            key={sci}
                            className="species-row flex items-center gap-3 px-3 py-2.5 border-b"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                          >
                            {seen ? (
                              <CheckSquare size={22} strokeWidth={1.75} className="moss shrink-0" />
                            ) : (
                              <Square size={22} strokeWidth={1.5} className="ink-faint shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-[15px] leading-tight ${seen ? 'ink' : 'ink-soft'}`}
                                style={seen ? { fontWeight: 600 } : undefined}
                              >
                                {common}
                              </div>
                              <div className="font-mono text-[10px] ink-faint mt-0.5 truncate" style={{ fontStyle: 'italic' }}>{sci}</div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* footer count */}
        <div className="relative px-6 py-3 border-t rule flex items-center justify-between">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
            {totalShown} shown · {groups.length} {groups.length === 1 ? 'family' : 'families'}
          </span>
          <button onClick={onClose} className="btn-ghost rounded-full px-4 py-1.5 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Sightings map drawer — kernel-density heatmap of observation locations
// ============================================================================
const STATES = feature(statesTopo, statesTopo.objects.states);
const STATE_BORDERS = mesh(statesTopo, statesTopo.objects.states, (a, b) => a !== b);
const NATION_BORDER = mesh(statesTopo, statesTopo.objects.states, (a, b) => a === b);
// Merged US outline as a fillable MultiPolygon (for clipPath)
const NATION_OUTLINE = merge(statesTopo, statesTopo.objects.states.geometries);

// Albers USA projection sized for a 700×440 viewBox
const MAP_W = 700;
const MAP_H = 440;
const PROJECTION = geoAlbersUsa().scale(900).translate([MAP_W / 2, MAP_H / 2]);
const PATH = geoPath(PROJECTION);
// Identity path (no projection) for rendering contour features whose coords
// are already in screen pixels.
const PIXEL_PATH = geoPath();

// Warm sequential color scale: transparent → bright peach red.
// `t` in [0, 1]. The lowest stop is fully transparent so the outer fringe of
// each hotspot fades naturally into the map background instead of stopping at
// a hard 60%-alpha edge.
function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [
    { at: 0.00, c: [253, 218, 100, 0.00] }, // fully transparent fringe
    { at: 0.20, c: [251, 195,  90, 0.40] }, // golden yellow emerging
    { at: 0.40, c: [248, 160,  75, 0.66] }, // warm amber
    { at: 0.60, c: [243, 125,  65, 0.80] }, // soft orange
    { at: 0.80, c: [232,  90,  55, 0.88] }, // peach
    { at: 1.00, c: [218,  60,  42, 0.92] }, // bright peach red
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].at) {
      const lo = stops[i - 1];
      const hi = stops[i];
      const u = (t - lo.at) / (hi.at - lo.at);
      const c = lo.c.map((v, k) => v + (hi.c[k] - v) * u);
      return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
    }
  }
  const c = stops[stops.length - 1].c;
  return `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
}

function SightingsMapDrawer({ points, onClose }) {
  // Project points to pixel space. Each point is [lng, lat, weight] where
  // weight is unique species count at that location. Older data stored as
  // [lng, lat] is handled by defaulting weight to 1.
  const { contours, projectedCount, maxValue, totalSpeciesAcrossLocations, totalLocations } = useMemo(() => {
    const projected = [];
    let totalW = 0;
    for (const p of points) {
      const lng = p[0], lat = p[1];
      const w = (p.length >= 3 && Number.isFinite(p[2])) ? p[2] : 1;
      const xy = PROJECTION([lng, lat]);
      if (xy && !isNaN(xy[0]) && !isNaN(xy[1])) {
        projected.push([xy[0], xy[1], w]);
        totalW += w;
      }
    }
    if (projected.length === 0) {
      return { contours: [], projectedCount: 0, maxValue: 0, totalSpeciesAcrossLocations: 0, totalLocations: 0 };
    }
    // Density estimation weighted by species count per location.
    // We sqrt-transform the weights so the gap between a 60-species home park
    // and a 3-species memorable travel spot is compressed enough that both
    // show up on the map. Relative ordering is preserved — bigger locations
    // still read as brighter — just on a more humane scale.
    const dc = contourDensity()
      .x((d) => d[0])
      .y((d) => d[1])
      .weight((d) => Math.sqrt(d[2]))
      .size([MAP_W, MAP_H])
      .cellSize(2)
      .bandwidth(5)
      .thresholds(28);
    const cs = dc(projected);
    const maxV = cs.length ? cs[cs.length - 1].value : 0;
    return {
      contours: cs,
      projectedCount: projected.length,
      maxValue: maxV,
      totalSpeciesAcrossLocations: totalW,
      totalLocations: projected.length,
    };
  }, [points]);

  // Highest single-location diversity (useful in the header)
  const peakDiversity = useMemo(() => {
    let m = 0;
    for (const p of points) {
      const w = (p.length >= 3 && Number.isFinite(p[2])) ? p[2] : 1;
      if (w > m) m = w;
    }
    return m;
  }, [points]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="max-w-3xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#142926', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Cartography</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>Where you've found birds</h2>
          <p className="ink-soft text-sm">
            <span className="rust font-mono" style={{ fontWeight: 600 }}>
              {totalLocations.toLocaleString()}
            </span> locations
            {peakDiversity > 0 && (
              <>
                {' · peak '}
                <span className="font-mono ink" style={{ fontWeight: 600 }}>{peakDiversity}</span> species at one spot
              </>
            )}
            <br />
            <span className="ink-faint">density weighted by species variety</span>
          </p>
        </div>

        {/* map body */}
        <div className="relative flex-1 overflow-auto p-2 sm:p-4">
          {projectedCount === 0 ? (
            <div className="text-center py-12 ink-faint text-sm">
              No locations with coordinates were found in your CSV.
            </div>
          ) : (
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto"
                style={{ background: 'transparent' }}
              >
                <defs>
                  <clipPath id="us-clip">
                    <path d={PATH(NATION_OUTLINE) || ''} />
                  </clipPath>
                </defs>

                {/* State fills — subtle white overlay on dark */}
                <g>
                  {STATES.features.map((s) => (
                    <path
                      key={s.id}
                      d={PATH(s) || ''}
                      fill="rgba(255,255,255,0.03)"
                      stroke="none"
                    />
                  ))}
                </g>

                {/* Heatmap contours, clipped to country outline */}
                <g clipPath="url(#us-clip)">
                  {contours.map((c, i) => (
                    <path
                      key={i}
                      d={PIXEL_PATH(c) || ''}
                      fill={heatColor(maxValue > 0 ? c.value / maxValue : 0)}
                      stroke="none"
                    />
                  ))}
                </g>

                {/* Internal state borders on top of heatmap */}
                <path
                  d={PATH(STATE_BORDERS) || ''}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={0.5}
                  strokeLinejoin="round"
                />

                {/* Outer national border */}
                <path
                  d={PATH(NATION_BORDER) || ''}
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                />
              </svg>

              {/* Continuous gradient legend */}
              <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                <span className="font-mono text-[10px] ink-faint tracking-widest uppercase">Few species</span>
                <svg width="160" height="12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="legend-grad" x1="0" y1="0" x2="1" y2="0">
                      {Array.from({ length: 21 }).map((_, i) => {
                        const t = i / 20;
                        return <stop key={i} offset={`${(t * 100).toFixed(0)}%`} stopColor={heatColor(t)} />;
                      })}
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="160" height="12" fill="url(#legend-grad)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" rx="2" />
                </svg>
                <span className="font-mono text-[10px] ink-faint tracking-widest uppercase">Many species</span>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="relative px-6 py-3 border-t rule flex items-center justify-between">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
            {projectedCount.toLocaleString()} of {points.length.toLocaleString()} locations mapped
            {projectedCount < points.length && ' (others outside lower 48 / AK / HI)'}
          </span>
          <button onClick={onClose} className="btn-ghost rounded-full px-4 py-1.5 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
