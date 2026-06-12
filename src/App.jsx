import { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, RefreshCw, Settings, AlertCircle, Check, X, FileText, Feather, List, Search, Square, CheckSquare, Map as MapIcon, ChevronLeft, ChevronRight, Share2, Plus, Download } from 'lucide-react';
import { storage } from './lib/storage.js';
import { BluebirdMascot, Cardinal, Cloud, Sparkle, Compass, TreeIcon, HeartIcon, EyeIcon, CalendarIcon, ChecklistIcon } from './Illustrations.jsx';
import { geoAlbersUsa, geoAlbers, geoPath, geoContains, geoCentroid } from 'd3-geo';
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
  ["Wilson's Plover","Anarhynchus wilsonia"],
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
  ["Brandt's Cormorant","Urile penicillatus"],
  ["Red-faced Cormorant","Urile urile"],
  ["Pelagic Cormorant","Urile pelagicus"],
  ["Great Cormorant","Phalacrocorax carbo"],
  ["Double-crested Cormorant","Nannopterum auritum"],
  ["Neotropic Cormorant","Nannopterum brasilianum"],
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
  ["Cooper's Hawk","Astur cooperii"],
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
  ["Ruby-crowned Kinglet","Corthylio calendula"],
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
  ["Urile penicillatus","Cormorants"],
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

// IUCN Red List status for the at-risk native species within the 774.
// Source: IUCN Red List via "List of threatened birds of the United States"
// (VU/EN/CR globally threatened, plus the two Near Threatened US species).
// Scientific names reconciled to current eBird/Clements taxonomy (e.g.
// Oceanodroma→Hydrobates, Vestiaria→Drepanis, Puffinus→Ardenna,
// Ammodramus→Ammospiza, Hemignathus munroi→wilsoni, Oreomystis mana→Loxops
// mana, Hemignathus flavus/kauaiensis→Chlorodrepanis). 61 species.
const IUCN_STATUS = {
  // Vulnerable (VU)
  "Phoebastria albatrus": "VU", "Pterodroma cervicalis": "VU", "Pterodroma cookii": "VU",
  "Pterodroma externa": "VU", "Pterodroma sandwichensis": "VU", "Ardenna bulleri": "VU",
  "Ardenna creatopus": "VU", "Branta sandvicensis": "VU", "Clangula hyemalis": "VU",
  "Polysticta stelleri": "VU", "Tympanuchus pallidicinctus": "VU", "Tympanuchus cupido": "VU",
  "Fulica alai": "VU", "Rissa brevirostris": "VU", "Numenius tahitiensis": "VU",
  "Synthliboramphus craveri": "VU", "Synthliboramphus hypoleucus": "VU",
  "Aphelocoma coerulescens": "VU", "Aphelocoma insularis": "VU", "Gymnorhinus cyanocephalus": "VU",
  "Catharus bicknelli": "VU", "Myadestes obscurus": "VU", "Toxostoma bendirei": "VU",
  "Anthus spragueii": "VU", "Setophaga cerulea": "VU", "Euphagus carolinus": "VU",
  "Magumma parva": "VU", "Telespiza cantans": "VU", "Chasiempis sandwichensis": "VU",
  "Chasiempis sclateri": "VU", "Drepanis coccinea": "VU", "Ammospiza caudacuta": "VU",
  "Chlorodrepanis flava": "VU", "Chlorodrepanis stejnegeri": "VU",
  // Endangered (EN)
  "Pterodroma cahow": "EN", "Pterodroma hasitata": "EN", "Anas wyvilliana": "EN",
  "Centrocercus minimus": "EN", "Grus americana": "EN", "Brachyramphus marmoratus": "EN",
  "Setophaga chrysoparia": "EN", "Agelaius tricolor": "EN", "Loxops coccineus": "EN",
  "Paroreomyza montana": "EN", "Chasiempis ibidis": "EN", "Hydrobates homochroa": "EN",
  "Loxops mana": "EN", "Hemignathus wilsoni": "EN",
  // Critically Endangered (CR)
  "Puffinus newelli": "CR", "Anas laysanensis": "CR", "Gymnogyps californianus": "CR",
  "Myadestes palmeri": "CR", "Acrocephalus familiaris": "CR", "Loxioides bailleui": "CR",
  "Loxops caeruleirostris": "CR", "Oreomystis bairdi": "CR", "Palmeria dolei": "CR",
  "Pseudonestor xanthophrys": "CR", "Telespiza ultima": "CR",
  // Near Threatened (NT) — the two US NT species
  "Brachyramphus brevirostris": "NT", "Vireo atricapilla": "NT",
};
const AT_RISK_SCI = new Set(Object.keys(IUCN_STATUS));

// ---------- storage keys ----------
const STORAGE = {
  userCount: 'ebird:userCount',
  csvMeta: 'ebird:csvMeta',
  seenSci: 'ebird:seenSci',
  points: 'ebird:points',
  firstSightingPoints: 'ebird:firstSightingPoints',
  locations: 'ebird:locations',
  apiKey: 'ebird:apiKey',
  // Cached eBird API responses live under 'ebird:hotspot:{locId}'
};

// ---------- eBird API client ----------
// Public docs: https://documenter.getpostman.com/view/664302/S1ENwy59
// Auth: send the user's API key as the X-eBirdApiToken header.
// All endpoints are GET, JSON responses.
const EBIRD_BASE = 'https://api.ebird.org/v2';
const HOTSPOT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function ebirdFetch(path, apiKey) {
  const res = await fetch(`${EBIRD_BASE}${path}`, {
    headers: { 'X-eBirdApiToken': apiKey },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`eBird ${res.status}${txt ? ': ' + txt.slice(0, 120) : ''}`);
  }
  return res.json();
}

// "Recent observations at a hotspot, last N days" — returns observations with
// scientific names already populated. Good for surfacing "actually findable
// now" species. The `back` param maxes out at 30 days on the public API.
async function fetchRecentAtLocation(locId, apiKey, back = 30) {
  return ebirdFetch(
    `/data/obs/${locId}/recent?back=${back}&maxResults=10000&includeProvisional=false`,
    apiKey,
  );
}

// All observations at a hotspot on a specific date. Unlike the various "recent"
// endpoints (which dedupe to one entry per species per location), historic
// returns every individual observation submitted on that date — so we can
// actually count how many distinct people reported a given bird. This is the
// endpoint that powers the "≥ 2 separate observers" verification.
async function fetchHistoricAtLocation(locId, year, month, day, apiKey) {
  return ebirdFetch(
    `/data/obs/${locId}/historic/${year}/${month}/${day}?maxResults=10000&includeProvisional=false`,
    apiKey,
  );
}

// Lightweight per-hotspot cache (IndexedDB via the existing storage helper)
async function getCachedHotspot(locId) {
  const v = await storage.get(`ebird:hotspot:${locId}`);
  if (!v || !v.timestamp || !v.data) return null;
  if (Date.now() - v.timestamp > HOTSPOT_TTL_MS) return null;
  return v.data;
}
async function setCachedHotspot(locId, data) {
  await storage.set(`ebird:hotspot:${locId}`, { timestamp: Date.now(), data });
}

// Per-(hotspot, day) cache for historic observations. 24h TTL — short enough
// that "today" stays reasonably fresh, long enough that scrolling through
// recent days is instant. Older days are essentially frozen anyway.
const HISTORIC_TTL_MS = 24 * 60 * 60 * 1000;
async function getCachedHistoric(locId, dateStr) {
  const v = await storage.get(`ebird:hist:${locId}:${dateStr}`);
  if (!v || !v.timestamp) return null;
  if (Date.now() - v.timestamp > HISTORIC_TTL_MS) return null;
  return v.data || [];
}
async function setCachedHistoric(locId, dateStr, data) {
  await storage.set(`ebird:hist:${locId}:${dateStr}`, {
    timestamp: Date.now(),
    data: data || [],
  });
}

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
          const locNameKey = ['Location'].find(k => k in sample) || 'Location';

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
          // Group countable observations by location.
          // `locations` keeps full data needed for both the heatmap (lng/lat/weight)
          // AND the tips feature (id/name/native species list).
          const locations = new Map();
          // For "First Sightings" heatmap: track the EARLIEST observation of each
          // species across all rows. The location of that first sighting is where
          // the user "discovered" that species. We keep date as a comparable epoch
          // number rather than parsing per-row repeatedly.
          const firstSightingByss = new Map(); // sci → {ts, lng, lat}
          // Native species seen per region, keyed by region id (pnw, cal, ...)
          // We read the state from the existing "State/Province" column (which
          // we already require to be "US-XX") and look up its region.
          const speciesByRegion = new Map();
          // Diagnostic: scientific names from countable rows that AREN'T in
          // NATIVE_SCI. Most will be legitimate non-natives (introduced
          // species, vagrant exotics) — but some may indicate AOS/Clements
          // taxonomy updates the app's checklist hasn't caught up with, like
          // the 2021 cormorant split (Phalacrocorax → Urile / Nannopterum).
          // Surfacing the list lets the user (and me) spot these.
          const unrecognized = new Map(); // sci → { sci, com, count }
          let earliest = null, latest = null;
          let totalObservations = 0;

          for (const r of usRows) {
            totalObservations++;
            const sci = (r[sciKey] || '').trim();
            const com = r[comKey];
            const dStr = r[dateKey];
            const dt = dStr ? new Date(dStr) : null;
            const dtValid = dt && !isNaN(dt);
            // "US-NC" → "NC" → "se". Cheap & only runs once per row.
            const stateAbbr = (r[stateKey] || '').slice(3);
            const regionId = STATE_TO_REGION[stateAbbr] || null;
            // eBird CSVs export subspecies-level reports as TRINOMIALS, e.g.
            // "Dryobates villosus septentrionalis" for Eastern Hairy Woodpecker.
            // Those won't match a binomial NATIVE_SCI entry. Strip to first two
            // tokens so subspecies reports collapse to their parent species.
            // (Spuhs/slashes/hybrids are already filtered by isCountable above,
            // so the first two tokens here are always a valid Genus species.)
            const baseSci = sci ? sci.split(/\s+/).slice(0, 2).join(' ') : '';

            if (isCountable(sci, com)) {
              // Use the binomial form as the species key so subspecies reports
              // don't create phantom "extra" species in counters and tips.
              const speciesKey = baseSci || com;
              allSpecies.add(speciesKey);
              if (baseSci && NATIVE_SCI.has(baseSci)) {
                nativeSci.add(baseSci);
                if (regionId) {
                  let set = speciesByRegion.get(regionId);
                  if (!set) { set = new Set(); speciesByRegion.set(regionId, set); }
                  set.add(baseSci);
                }
              } else if (sci) {
                // Sci name present but not in our native checklist. Could be a
                // legitimate exotic or a taxonomy-update miss. Bucket it for
                // the diagnostic — under the *original* sci so we can see the
                // exact name eBird is exporting.
                let entry = unrecognized.get(sci);
                if (!entry) { entry = { sci, com: com || '', count: 0 }; unrecognized.set(sci, entry); }
                entry.count++;
              }
              const lat = parseFloat(r[latKey]);
              const lng = parseFloat(r[lngKey]);
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                // Prefer eBird's Location ID; fall back to coordinate key
                const locId = (r[locIdKey] && String(r[locIdKey]).trim()) ||
                              `${lng.toFixed(5)},${lat.toFixed(5)}`;
                let loc = locations.get(locId);
                if (!loc) {
                  loc = {
                    id: locId,
                    name: (r[locNameKey] && String(r[locNameKey]).trim()) || null,
                    lng, lat,
                    species: new Set(),
                    nativeSpecies: new Set(),
                  };
                  locations.set(locId, loc);
                }
                loc.species.add(speciesKey);
                if (baseSci && NATIVE_SCI.has(baseSci)) {
                  loc.nativeSpecies.add(baseSci);
                }
                // Track the first sighting of this species. Use the binomial
                // sci when available so subspecies reports of one species map
                // to a single "first sighting" rather than producing duplicates.
                const key = baseSci || com;
                if (key && dtValid) {
                  const ts = dt.getTime();
                  const prev = firstSightingByss.get(key);
                  if (!prev || ts < prev.ts) {
                    firstSightingByss.set(key, { ts, lng, lat });
                  }
                }
              }
            }
            if (dtValid) {
              if (!earliest || dt < earliest) earliest = dt;
              if (!latest || dt > latest) latest = dt;
            }
          }

          // Aggregate first sightings by location: each species's first-found
          // location gets +1 weight. This flattens the heatmap compared to the
          // overall-sightings version, since recurring visits to a single
          // hotspot only add weight for *new* species there, not every species
          // re-seen.
          const firstByLoc = new Map(); // "lng,lat" → {lng, lat, count}
          for (const { lng, lat } of firstSightingByss.values()) {
            const k = `${lng.toFixed(5)},${lat.toFixed(5)}`;
            let entry = firstByLoc.get(k);
            if (!entry) {
              entry = { lng, lat, count: 0 };
              firstByLoc.set(k, entry);
            }
            entry.count++;
          }

          // Outputs:
          //   points              — [[lng, lat, speciesCount], ...] heatmap, ALL species seen
          //   firstSightingPoints — [[lng, lat, newSpeciesCount], ...] heatmap, FIRST sightings only
          //   locations           — [{id, name, lng, lat, species, nativeSpecies}, ...] for tips
          const points = [];
          const locationsArr = [];
          for (const loc of locations.values()) {
            points.push([loc.lng, loc.lat, loc.species.size]);
            // Only locations with a real eBird Location ID can be queried via the API.
            // Coordinate-key locations are kept out of the tips dataset.
            if (loc.id && loc.id.startsWith('L')) {
              locationsArr.push({
                id: loc.id,
                name: loc.name,
                lng: loc.lng,
                lat: loc.lat,
                species: Array.from(loc.nativeSpecies),
              });
            }
          }
          const firstSightingPoints = [];
          for (const { lng, lat, count } of firstByLoc.values()) {
            firstSightingPoints.push([lng, lat, count]);
          }

          resolve({
            count: nativeSci.size,
            allCount: allSpecies.size,
            seenSci: Array.from(nativeSci),
            points,
            firstSightingPoints,
            locations: locationsArr,
            meta: {
              observations: totalObservations,
              earliest: earliest ? earliest.toISOString() : null,
              latest: latest ? latest.toISOString() : null,
              fileName: file.name,
              updatedAt: new Date().toISOString(),
              allCount: allSpecies.size,
              locationCount: points.length,
              ebirdLocations: locationsArr.length,
              firstSightingLocations: firstSightingPoints.length,
              // { 'pnw': 87, 'cal': 134, ... } — native species count per region
              regionNativeCount: Object.fromEntries(
                Array.from(speciesByRegion, ([id, set]) => [id, set.size])
              ),
              // Sorted by observation count desc; top 200 only to keep meta
              // small. The full list of unmatched sci names lets us see which
              // species in the CSV didn't hit our native checklist.
              unrecognizedSci: Array.from(unrecognized.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 200),
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
  const [points, setPoints] = useState(null); // [[lng, lat, w], ...] for heatmap, all species
  const [firstSightingPoints, setFirstSightingPoints] = useState(null); // [[lng, lat, w], ...] for first-sighting heatmap
  const [locations, setLocations] = useState(null); // [{id, name, lng, lat, species}] for tips
  const [apiKey, setApiKey] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showFamilies, setShowFamilies] = useState(false);
  // When non-null, the species list drawer is opened in a scoped view
  // (e.g. only Code 3 birds, or only species in one family).
  const [listFilter, setListFilter] = useState(null);
  // Top-level view router. 'dashboard' is the count/stats home; 'map' is the
  // full-page heatmap. Keeping this on the parent (rather than a route) lets
  // us swap the entire content area without losing state in the other view.
  const [view, setView] = useState('dashboard');
  const [showInstall, setShowInstall] = useState(false);
  // Deferred install prompt from Chrome/Edge/Samsung Internet — captured at
  // load time, fired only when the user clicks our install button. iOS Safari
  // never produces this event so we fall back to manual instructions there.
  const [installPrompt, setInstallPrompt] = useState(null);
  // True once the user has accepted the prompt (or if the app is already
  // running in standalone mode). We hide the install UI in both cases.
  const [isInstalled, setIsInstalled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [progressAnim, setProgressAnim] = useState(0);
  const fileRef = useRef(null);

  // Detect "already installed" state on mount + when display-mode changes.
  useEffect(() => {
    const check = () => {
      const standalone =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;
      setIsInstalled(standalone);
    };
    check();
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener?.('change', check);
    return () => mq.removeEventListener?.('change', check);
  }, []);

  // Capture beforeinstallprompt so we can fire it on demand.
  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    function onInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    // If Chrome/Edge handed us a deferred prompt, fire it now.
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      } catch (e) {
        // Some browsers throw if prompt() is called twice — open the manual
        // instructions as a fallback.
        setShowInstall(true);
      }
    } else {
      // iOS Safari or browser without prompt support → show the tutorial.
      setShowInstall(true);
    }
  }

  // ---- open-helpers for the species list drawer ----
  function openAllSpecies() {
    setListFilter(null);
    setShowList(true);
  }
  function openCode3List() {
    setListFilter({
      title: 'Rare Bird Finds',
      eyebrow: 'ABA Code 3',
      subtitle: 'rare but annual',
      restrictType: 'code3',
    });
    setShowList(true);
  }
  function openAtRiskList() {
    setListFilter({
      title: 'At-Risk Species',
      eyebrow: 'IUCN Red List',
      subtitle: 'threatened with extinction',
      restrictType: 'atrisk',
    });
    setShowList(true);
  }
  function openFamilyList(family) {
    setListFilter({
      title: family,
      eyebrow: 'Family',
      restrictType: 'family',
      restrictValue: family,
    });
    setShowList(true);
  }

  // hydrate from storage
  useEffect(() => {
    (async () => {
      const [u, m, s, p, fp, l, k] = await Promise.all([
        storage.get(STORAGE.userCount),
        storage.get(STORAGE.csvMeta),
        storage.get(STORAGE.seenSci),
        storage.get(STORAGE.points),
        storage.get(STORAGE.firstSightingPoints),
        storage.get(STORAGE.locations),
        storage.get(STORAGE.apiKey),
      ]);
      if (u) setUserCount(parseInt(u, 10));
      if (m) { try { setCsvMeta(JSON.parse(m)); } catch {} }
      if (s) { try { setSeenSci(new Set(JSON.parse(s))); } catch {} }
      if (p) { try { setPoints(JSON.parse(p)); } catch {} }
      if (fp) { try { setFirstSightingPoints(JSON.parse(fp)); } catch {} }
      if (l) { try { setLocations(JSON.parse(l)); } catch {} }
      if (k) setApiKey(k);
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
      const { count, allCount, seenSci: nextSeen, points: nextPoints, firstSightingPoints: nextFirstSightingPoints, locations: nextLocations, meta } = await parseEBirdCsv(file);
      const seenSet = new Set(nextSeen);
      setUserCount(count);
      setCsvMeta(meta);
      setSeenSci(seenSet);
      setPoints(nextPoints);
      setFirstSightingPoints(nextFirstSightingPoints);
      setLocations(nextLocations);
      await storage.set(STORAGE.userCount, String(count));
      await storage.set(STORAGE.csvMeta, JSON.stringify(meta));
      await storage.set(STORAGE.seenSci, JSON.stringify(nextSeen));
      await storage.set(STORAGE.points, JSON.stringify(nextPoints));
      await storage.set(STORAGE.firstSightingPoints, JSON.stringify(nextFirstSightingPoints));
      await storage.set(STORAGE.locations, JSON.stringify(nextLocations));
      const extra = allCount - count;
      const extraNote = extra > 0 ? ` (${extra} non-native or rare visitor${extra === 1 ? '' : 's'} excluded)` : '';
      setSuccess(`Counted ${count.toLocaleString()} of ${TOTAL} native species${extraNote}.`);
    } catch (e) {
      setError("Couldn't read that file. Make sure it's the MyEBirdData.csv export from My eBird → Download My Data.");
    } finally {
      setLoading(false);
    }
  }

  async function saveApiKey(value) {
    const trimmed = (value || '').trim();
    if (trimmed) {
      await storage.set(STORAGE.apiKey, trimmed);
      setApiKey(trimmed);
    } else {
      await storage.del(STORAGE.apiKey);
      setApiKey(null);
    }
  }

  async function resetAll() {
    if (!confirm('Clear stored data (count, sightings, CSV summary, map, cached tips)? Your eBird API key is kept.')) return;
    // Clear bird/location data
    await Promise.all([
      storage.del(STORAGE.userCount),
      storage.del(STORAGE.csvMeta),
      storage.del(STORAGE.seenSci),
      storage.del(STORAGE.points),
      storage.del(STORAGE.firstSightingPoints),
      storage.del(STORAGE.locations),
    ]);
    // Also flush cached per-hotspot, per-species, and historic-day eBird data
    try {
      const [hotspotKeys, speciesKeys, histKeys] = await Promise.all([
        storage.list('ebird:hotspot:'),
        storage.list('ebird:species:'),
        storage.list('ebird:hist:'),
      ]);
      const all = [
        ...(hotspotKeys?.keys || []),
        ...(speciesKeys?.keys || []),
        ...(histKeys?.keys || []),
      ];
      await Promise.all(all.map((k) => storage.del(k)));
    } catch {
      // list() may not be supported by older storage; non-fatal
    }
    setUserCount(null);
    setCsvMeta(null);
    setSeenSci(new Set());
    setPoints(null);
    setFirstSightingPoints(null);
    setLocations(null);
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

  const atRiskSeen = useMemo(() => {
    if (!seenSci || seenSci.size === 0) return 0;
    let n = 0;
    for (const sci of seenSci) if (AT_RISK_SCI.has(sci)) n++;
    return n;
  }, [seenSci]);

  const TOTAL_FAMILIES = FAMILY_BOUNDARIES.length;
  const TOTAL_CODE_3 = CODE_3_SCI.size;
  const TOTAL_AT_RISK = AT_RISK_SCI.size;

  const pct = userCount != null ? (userCount / TOTAL) * 100 : null;
  const remaining = userCount != null ? TOTAL - userCount : null;
  const empty = hydrated && userCount == null;

  return (
    <div className="font-body min-h-screen w-full relative" style={{
      // Sky gradient — sits behind the app content
      background: 'linear-gradient(180deg, #6cb8e4 0%, #a8d8eb 40%, #f8d9a8 100%)',
      backgroundAttachment: 'fixed',
      color: '#2a3445',
    }}>
      <style>{`
        /* ===========================================================
           Birdfolk visual tokens — chunky pastel Animal Crossing vibe.
           Replaces the old dark-teal field-guide tokens. All component
           classes referenced by name throughout App.jsx are redefined
           here so the look pivots without churning every className.
           =========================================================== */

        /* Typography — Fredoka for display headlines, Nunito for body,
           JetBrains Mono retained for technical numerics. */
        .font-display { font-family: 'Fredoka', system-ui, sans-serif; font-weight: 600; letter-spacing: 0; font-feature-settings: 'tnum' 1; }
        .font-body { font-family: 'Nunito', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum' 1; }

        /* Text colors — darker ink on cream paper */
        .ink { color: #2a3445; }
        .ink-soft { color: #5a4a3e; }
        .ink-faint { color: #7a6a55; }

        /* Accents — high-saturation cute palette.
           'rust' stays the name for backwards compatibility but now points
           to coral. 'moss' goes to mint, 'teal' goes to sky blue. */
        .rust { color: #ff6b6b; }
        .moss { color: #5cba87; }
        .teal { color: #5fa8d3; }

        /* Surfaces — chunky white cards with dark borders + offset shadows.
           This is the Animal Crossing "3D button" look applied to all card
           surfaces. surface-1 is the default white card; surface-2 is the
           slightly warmer cream card used for emphasis areas. */
        .surface-1 {
          background: #fff;
          border: 2.5px solid #2a3445;
          box-shadow: 0 4px 0 0 #2a3445;
          border-radius: 18px;
        }
        .surface-2 {
          background: #fff8e8;
          border: 2.5px solid #2a3445;
          box-shadow: 0 4px 0 0 #2a3445;
          border-radius: 18px;
        }
        .grain { /* retired — chunky shadows do the heavy lifting now */ }

        /* Rules / dividers */
        .rule { border-color: rgba(42,52,69,0.18); }
        .rule-dashed { background-image: linear-gradient(to right, rgba(42,52,69,0.25) 50%, transparent 50%); background-size: 8px 1px; background-repeat: repeat-x; height: 1px; }

        /* Animations — kept identical to old app for entrance choreography */
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .anim-1 { animation: fadeUp 0.5s 0.05s both ease-out; }
        .anim-2 { animation: fadeUp 0.5s 0.15s both ease-out; }
        .anim-3 { animation: fadeUp 0.5s 0.25s both ease-out; }
        .anim-4 { animation: fadeUp 0.5s 0.35s both ease-out; }
        .anim-5 { animation: fadeUp 0.5s 0.45s both ease-out; }
        .toast { animation: fadeIn 0.25s ease-out; }

        /* Stamp pill — small badge on the empty state etc. Now reads like
           a Nintendo-style "New!" badge in coral. */
        .stamp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: #ff6b6b;
          color: #fff;
          font-family: 'Fredoka', system-ui, sans-serif;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 2.5px solid #a83a3a;
          box-shadow: 0 2px 0 0 #a83a3a;
          text-shadow: 0 1px 0 #a83a3a;
          border-radius: 999px;
        }

        /* Buttons — chunky pills with offset shadows */
        .btn-ink {
          background: #ff6b6b;
          color: #fff;
          font-family: 'Fredoka', system-ui, sans-serif;
          font-weight: 700;
          border: 2.5px solid #a83a3a;
          box-shadow: 0 3px 0 0 #a83a3a;
          text-shadow: 0 1.5px 0 #a83a3a;
          letter-spacing: 0.02em;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .btn-ink:hover { transform: translateY(-1px); box-shadow: 0 4px 0 0 #a83a3a; }
        .btn-ink:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #a83a3a; }
        .btn-ink:disabled { background: rgba(0,0,0,0.08); color: rgba(0,0,0,0.4); border-color: rgba(0,0,0,0.15); box-shadow: 0 3px 0 0 rgba(0,0,0,0.15); text-shadow: none; cursor: not-allowed; transform: none; }

        .btn-ghost {
          background: #fff;
          color: #2a3445;
          font-family: 'Fredoka', system-ui, sans-serif;
          font-weight: 600;
          border: 2.5px solid #2a3445;
          box-shadow: 0 3px 0 0 #2a3445;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .btn-ghost:hover { transform: translateY(-1px); box-shadow: 0 4px 0 0 #2a3445; }
        .btn-ghost:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #2a3445; }
        .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* Inputs — friendly rounded with thick dark borders */
        .input-field {
          background: #fff;
          border: 2.5px solid #2a3445;
          color: #2a3445;
          border-radius: 12px;
          font-family: 'Nunito', system-ui, sans-serif;
          font-weight: 500;
        }
        .input-field::placeholder { color: #9a8a75; }
        .input-field:focus { outline: none; box-shadow: 0 0 0 3px rgba(255,107,107,0.25); }

        /* Lists / rows */
        .species-row { transition: background 0.12s; }
        .species-row:hover { background: rgba(255,224,102,0.18); }

        /* Card lift hover */
        .lift { transition: transform 0.12s, box-shadow 0.12s; }
        .lift:hover { transform: translateY(-2px); }
      `}</style>

      {view === 'dashboard' && (
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ===== Chunky sky banner header =====
            Sits at the top of every dashboard view. Sky-blue gradient with a
            thick dark border + offset shadow (signature AC button look). The
            bluebird mascot sits on the left, brand on the right of it, and
            the settings cog floats on the right as a chunky white circle.
            Decorative clouds drift in the background. */}
        <header
          className="anim-1 relative overflow-hidden rounded-3xl mb-5"
          style={{
            background: 'linear-gradient(135deg, #7cc4e8 0%, #a8dff5 60%, #c5e8ff 100%)',
            border: '3px solid #2a5680',
            boxShadow: '0 5px 0 0 #2a5680',
            padding: '14px 16px 16px',
          }}
        >
          <div className="absolute top-1.5 right-16 pointer-events-none"><Cloud size={48} opacity={0.85} /></div>
          <div className="absolute top-7 right-32 pointer-events-none"><Cloud size={32} opacity={0.7} /></div>
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BluebirdMascot size={52} className="flex-shrink-0 drop-shadow-md" />
              <div>
                <h1
                  className="font-display leading-none"
                  style={{
                    fontWeight: 700,
                    fontSize: '24px',
                    letterSpacing: '-0.01em',
                    color: '#fff',
                    textShadow: '0 2px 0 #2a5680, 0 3px 4px rgba(42,52,69,0.25)',
                  }}
                >
                  Birder
                </h1>
                <p
                  className="font-sans mt-1"
                  style={{
                    fontWeight: 700,
                    fontSize: '10px',
                    color: '#fff',
                    opacity: 0.92,
                    letterSpacing: '0.08em',
                    textShadow: '0 1px 0 #2a5680',
                  }}
                >
                  YOUR LIFE LIST
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#fff', border: '2.5px solid #2a5680',
                boxShadow: '0 3px 0 0 #2a5680',
                color: '#2a5680',
              }}
            >
              <Settings size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Friendly greeting strip — only when we have data */}
          {!empty && hydrated && csvMeta?.latest && (
            <div
              className="relative mt-3 flex items-center gap-2 px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '2px solid #2a5680',
                borderRadius: 12,
              }}
            >
              <Sparkle size={18} className="flex-shrink-0" />
              <p className="font-display text-xs sm:text-sm" style={{ fontWeight: 500, color: '#2a5680' }}>
                Hey! Latest entry was {fmtDate(csvMeta.latest)}.
              </p>
            </div>
          )}
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

            {!isInstalled && (
              <div className="mt-6 mb-3 text-center">
                <button
                  onClick={handleInstall}
                  className="btn-ghost rounded-full px-5 py-2 text-xs inline-flex items-center gap-2"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add Birder to your home screen
                </button>
              </div>
            )}

            <div className="text-center text-xs ink-faint flex items-center justify-center gap-3 flex-wrap">
              <button onClick={openAllSpecies} className="hover:ink transition-colors">
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
            {/* ===== Hero count card — TAPPABLE =====
                The whole card is a button. Tap anywhere on it to open the
                full species index. Visually identical to the previous div
                version (chunky white card, coral hero number with offset
                text-shadow, rainbow progress bar) — just rendered as a
                <button> with text-align center and matching styles. A small
                "tap to browse" microcopy sits beside the % complete line
                so the affordance is discoverable without a chevron crowding
                the hero number.
                ===== */}
            <button
              type="button"
              onClick={openAllSpecies}
              aria-label="Browse all 774 species"
              className="anim-2 mb-5 relative w-full block text-center lift"
              style={{
                background: 'linear-gradient(180deg, #fff 0%, #fff8e8 100%)',
                border: '3px solid #2a3445',
                boxShadow: '0 5px 0 0 #2a3445',
                borderRadius: 22,
                padding: '18px 20px 16px',
                cursor: 'pointer',
              }}
            >
              {/* Star badge popping out of the top-right corner */}
              <div
                className="absolute"
                style={{
                  top: -10, right: 18, width: 28, height: 28,
                  background: '#ffe066',
                  border: '2.5px solid #c9a01a',
                  borderRadius: '50%',
                  boxShadow: '0 3px 0 0 #c9a01a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#c9a01a', fontWeight: 900, fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ★
              </div>

              {/* "Life List" pill */}
              <div className="inline-flex" style={{ marginBottom: 10 }}>
                <span
                  className="font-display"
                  style={{
                    background: '#5fa8d3', color: '#fff',
                    fontWeight: 700, fontSize: 11,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: 999,
                    border: '2px solid #2a5680',
                    boxShadow: '0 2px 0 0 #2a5680',
                    textShadow: '0 1px 0 #2a5680',
                  }}
                >
                  Life List
                </span>
              </div>

              {/* The big coral 204 with offset text-shadow */}
              <div className="flex items-baseline justify-center gap-2 flex-wrap">
                <div
                  className="font-display"
                  style={{
                    fontWeight: 700,
                    fontSize: 'clamp(4rem, 18vw, 6rem)',
                    lineHeight: 0.92,
                    color: '#ff6b6b',
                    textShadow: '0 4px 0 #a83a3a, 0 5px 8px rgba(40,30,60,0.2)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {userCount != null ? fmt(userCount) : '—'}
                </div>
                <div
                  className="font-display"
                  style={{ fontWeight: 600, fontSize: '1.25rem', color: '#7a6a55' }}
                >
                  / {fmt(TOTAL)}
                </div>
              </div>

              {/* Rainbow progress bar */}
              <div
                className="mt-3 mx-auto"
                style={{
                  width: '88%', height: 12, borderRadius: 999,
                  background: '#f4e4c8',
                  border: '2px solid #2a3445',
                  overflow: 'hidden', position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(progressAnim * 100).toFixed(1)}%`,
                    background: 'linear-gradient(90deg, #7dd3a4, #5fa8d3, #ffe066, #ff7e7e)',
                    borderRadius: 999,
                    transition: 'width 0.6s ease-out',
                  }}
                />
              </div>
              <div
                className="font-display"
                style={{
                  fontWeight: 600, fontSize: 12, color: '#7a6a55',
                  marginTop: 8, letterSpacing: '0.02em',
                }}
              >
                <span style={{ color: '#ff6b6b', fontWeight: 700 }}>
                  {pct != null ? `${pct.toFixed(1)}%` : '—'}
                </span>
                {' complete · '}
                {remaining != null ? `${fmt(remaining)} to go!` : ''}
              </div>
              {/* Tap-to-browse microcopy — small, low-key, sits inside the
                  card so the button feels deliberate without an extra
                  affordance fighting the hero number. */}
              <div
                className="font-sans inline-flex items-center justify-center gap-1.5 mt-2"
                style={{
                  fontWeight: 700, fontSize: 10, color: '#7a6a55',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: 0.75,
                }}
              >
                <List size={11} strokeWidth={2.5} />
                Tap to browse the full list
              </div>
            </button>

            {/* "Your collection" section title with yellow accent dot */}
            <div className="anim-5 mb-2 mt-1 flex items-center gap-2">
              <span
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#ffe066', border: '2px solid #c9a01a',
                  display: 'inline-block',
                }}
              />
              <h2 className="font-display" style={{ fontWeight: 600, fontSize: 15, color: '#2a3445', letterSpacing: '0.01em' }}>
                Your collection
              </h2>
            </div>

            {/* ===== Color-coded chunky stat tiles =====
                Five color themes (mint/coral/sky/lemon/peach) one per tile.
                Each tile is a chunky rounded card with thick dark border +
                offset shadow + colored fill + illustrated icon.
                ===== */}
            <div className="grid grid-cols-2 gap-2.5 mb-4 anim-5">
              {/* Observations (sky theme) */}
              <div
                style={{
                  background: '#d8eef9', border: '2.5px solid #2a5680',
                  boxShadow: '0 4px 0 0 #2a5680', borderRadius: 18,
                  padding: '12px 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <ChecklistIcon size={32} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Sightings
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 24, color: '#2a3445', lineHeight: 1 }}>
                      {csvMeta ? fmt(csvMeta.observations) : '—'}
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  since {csvMeta?.earliest ? fmtDate(csvMeta.earliest) : '—'}
                </div>
              </div>

              {/* Families (mint theme) — tap to open the families drawer */}
              <button
                onClick={() => setShowFamilies(true)}
                aria-label="View all bird families"
                className="text-left lift"
                style={{
                  background: '#d8f3df', border: '2.5px solid #2e6b4f',
                  boxShadow: '0 4px 0 0 #2e6b4f', borderRadius: 18,
                  padding: '12px 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <TreeIcon size={28} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Families
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 24, color: '#2a3445', lineHeight: 1 }}>
                      {familiesSeen}<span style={{ fontSize: 13, color: '#7a6a55', fontWeight: 600, marginLeft: 3 }}>/{TOTAL_FAMILIES}</span>
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  tap to browse
                </div>
              </button>

              {/* At-risk (coral theme) — tap to open at-risk list */}
              <button
                onClick={openAtRiskList}
                aria-label="View at-risk native species"
                className="text-left lift"
                style={{
                  background: '#ffe0d4', border: '2.5px solid #a83a3a',
                  boxShadow: '0 4px 0 0 #a83a3a', borderRadius: 18,
                  padding: '12px 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <HeartIcon size={28} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      At-risk
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 24, color: '#2a3445', lineHeight: 1 }}>
                      {atRiskSeen}<span style={{ fontSize: 13, color: '#7a6a55', fontWeight: 600, marginLeft: 3 }}>/{TOTAL_AT_RISK}</span>
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  IUCN threatened
                </div>
              </button>

              {/* Latest (lemon theme) */}
              <div
                style={{
                  background: '#fff3c4', border: '2.5px solid #c9a01a',
                  boxShadow: '0 4px 0 0 #c9a01a', borderRadius: 18,
                  padding: '12px 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <CalendarIcon size={28} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Latest
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 18, color: '#2a3445', lineHeight: 1 }}>
                      {csvMeta?.latest ? fmtDate(csvMeta.latest) : '—'}
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  most recent entry
                </div>
              </div>
            </div>

            {/* ===== Tertiary action row — Find Missed Birds =====
                Browse-all moved up under the hero. This row now holds only
                the eBird-API-powered "find missed birds" affordance (and any
                future tools we add). */}
            <div className="anim-5 flex flex-wrap items-center gap-2 mb-4">
              {userCount != null && (
                <button
                  onClick={() => setShowTips(true)}
                  className="btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
                >
                  <Search size={14} strokeWidth={2.5} />
                  Find missed birds
                </button>
              )}
            </div>

            {/* ===== Map CTA — chunky green pill (the big "go explore" button) ===== */}
            {points && points.length > 0 && (
              <button
                onClick={() => setView('map')}
                className="anim-5 w-full inline-flex items-center justify-between gap-3 mb-4"
                style={{
                  background: 'linear-gradient(180deg, #7dd3a4 0%, #5cba87 100%)',
                  border: '3px solid #2e6b4f',
                  boxShadow: '0 5px 0 0 #2e6b4f',
                  borderRadius: 20,
                  padding: '14px 18px',
                  color: '#fff',
                }}
              >
                <div className="flex items-center gap-3">
                  <Compass size={42} className="flex-shrink-0" />
                  <div className="text-left">
                    <div
                      className="font-display"
                      style={{
                        fontWeight: 700, fontSize: 18, letterSpacing: '0.01em',
                        textShadow: '0 1.5px 0 #2e6b4f', lineHeight: 1,
                      }}
                    >
                      My Map
                    </div>
                    <div
                      className="font-sans"
                      style={{
                        fontWeight: 600, fontSize: 11, marginTop: 3,
                        color: '#e0fff0',
                      }}
                    >
                      {csvMeta?.locationCount ? fmt(csvMeta.locationCount) : '—'} sites · 11 regions
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#fff', border: '2.5px solid #2e6b4f',
                    boxShadow: '0 2px 0 0 #2e6b4f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#2e6b4f',
                    fontWeight: 700, fontSize: 18,
                  }}
                >
                  ›
                </div>
              </button>
            )}

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
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <button onClick={() => setShowAbout(true)} className="ink-soft hover:ink transition-colors">about the {TOTAL}</button>
                  {!isInstalled && (
                    <>
                      <span className="ink-faint">·</span>
                      <button onClick={handleInstall} className="ink-soft hover:ink transition-colors">add to home screen</button>
                    </>
                  )}
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
      )}

      {view === 'map' && (
        <SightingsMapView
          pointsAll={points || []}
          pointsFirst={firstSightingPoints}
          userCount={userCount}
          familiesSeen={familiesSeen}
          code3Seen={code3Seen}
          atRiskSeen={atRiskSeen}
          locationCount={csvMeta?.locationCount || (points?.length ?? 0)}
          regionNativeCount={csvMeta?.regionNativeCount || {}}
          locations={locations || []}
          onBack={() => setView('dashboard')}
        />
      )}

      {/* toasts */}
      {(error || success) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 toast z-50 max-w-md w-[90%]">
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl"
               style={{
                 background: error ? '#ffe0d4' : '#d8f3df',
                 border: `2.5px solid ${error ? '#a83a3a' : '#2e6b4f'}`,
                 boxShadow: `0 4px 0 0 ${error ? '#a83a3a' : '#2e6b4f'}`,
                 color: '#2a3445',
               }}>
            {error
              ? <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#a83a3a' }} />
              : <Check size={18} className="shrink-0 mt-0.5" style={{ color: '#2e6b4f' }} />}
            <div className="flex-1 text-sm leading-relaxed font-sans font-semibold">{error || success}</div>
            <button onClick={() => { setError(null); setSuccess(null); }} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* families drawer — rendered first so the species drawer (when both are
          open via a family drilldown) stacks on top */}
      {showFamilies && (
        <FamiliesDrawer
          seenSci={seenSci}
          onClose={() => setShowFamilies(false)}
          onFamilyClick={(family) => openFamilyList(family)}
        />
      )}

      {/* species list drawer — accepts optional title/subtitle/eyebrow/restrictFn
          via the listFilter object, set when opening from a stat card or family */}
      {showList && (
        <SpeciesListDrawer
          seenSci={seenSci}
          onClose={() => { setShowList(false); }}
          {...(listFilter || {})}
        />
      )}

      {/* tips drawer — eBird API hints for missed species at visited hotspots */}
      {showTips && (
        <TipsDrawer
          apiKey={apiKey}
          locations={locations}
          seenSci={seenSci}
          onClose={() => setShowTips(false)}
          onOpenSettings={() => { setShowTips(false); setShowSettings(true); }}
        />
      )}

      {/* install prompt drawer (manual instructions for iOS / browsers without programmatic install) */}
      {showInstall && <InstallPromptDrawer onClose={() => setShowInstall(false)} />}

      {/* settings drawer */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setShowSettings(false)}>
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
                className="text-xs ink-soft block w-full file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#ff6b6b] file:text-white file:cursor-pointer hover:file:bg-[#ff8888]"
                onChange={(e) => onCsvFile(e.target.files?.[0])}
              />
              {csvMeta && (
                <span className="text-xs ink-faint mt-2 block">
                  Current: {csvMeta.fileName || 'data.csv'} · {fmt(csvMeta.observations)} obs · {relativeTime(csvMeta.updatedAt)}
                </span>
              )}
            </label>

            <div className="border-t rule my-6" />

            <label className="block mb-6">
              <span className="font-mono text-[10px] ink-faint tracking-widest uppercase block mb-2 flex items-center justify-between">
                <span>eBird API key</span>
                {apiKey && (
                  <span className="moss font-mono text-[10px]" style={{ fontWeight: 600 }}>● Connected</span>
                )}
              </span>
              <input
                type="text"
                defaultValue={apiKey || ''}
                onBlur={(e) => saveApiKey(e.target.value)}
                placeholder="optional · enables missed-bird tips"
                className="input-field rounded-lg px-3 py-2 text-sm w-full font-mono"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="text-xs ink-faint mt-2 block leading-relaxed">
                Get a free key at{' '}
                <a href="https://ebird.org/api/keygen" target="_blank" rel="noopener noreferrer" className="rust underline">
                  ebird.org/api/keygen
                </a>{' '}
                · stored locally on this device only · used to fetch recent observations at your hotspots
                {apiKey && (
                  <>
                    <br />
                    <button onClick={() => saveApiKey('')} className="rust underline mt-1">Clear key</button>
                  </>
                )}
              </span>
            </label>

            <div className="border-t rule my-6" />

            <div className="space-y-1">
              <button
                onClick={() => { openAllSpecies(); setShowSettings(false); }}
                className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
              >
                Browse all {TOTAL} species →
              </button>
              {points && points.length > 0 && (
                <button
                  onClick={() => { setView('map'); setShowSettings(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
                >
                  Sightings map →
                </button>
              )}
              {userCount != null && (
                <button
                  onClick={() => { setShowTips(true); setShowSettings(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
                >
                  Find missed birds →
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

            {/* Taxonomy diagnostic. Lists scientific names in the user's CSV
                that we didn't recognize as native US species. Most are real
                exotics (House Sparrow, Eurasian Collared-Dove, etc.) that are
                correctly excluded — but the list also catches AOS/Clements
                taxonomy updates the app hasn't absorbed yet (e.g. cormorants
                moving from Phalacrocorax to Urile/Nannopterum in 2021). If
                you see a recognizable native bird here, that's a bug in the
                app's checklist worth reporting. */}
            {Array.isArray(csvMeta?.unrecognizedSci) && csvMeta.unrecognizedSci.length > 0 && (
              <>
                <details className="block group">
                  <summary className="cursor-pointer list-none flex items-center justify-between px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors">
                    <span>
                      <span className="rust font-mono" style={{ fontWeight: 600 }}>{csvMeta.unrecognizedSci.length}</span>
                      {' '}unmatched species in CSV
                    </span>
                    <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-2 mb-2 px-3 py-3 rounded-lg bg-black/20 text-xs leading-relaxed">
                    <p className="ink-faint mb-3">
                      Scientific names from your CSV that aren't on the app's
                      native checklist. Many are correctly excluded as
                      naturalized non-natives (House Sparrow, European Starling,
                      etc.). Others may indicate AOS taxonomy updates the app
                      needs — if a real native shows up here, that's a bug.
                    </p>
                    <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                      {csvMeta.unrecognizedSci.map((u, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="ink truncate" style={{ fontWeight: 500 }}>
                              {u.com || u.sci}
                            </div>
                            <div className="font-mono text-[10px] ink-faint italic truncate">{u.sci}</div>
                          </div>
                          <div className="font-mono text-[10px] ink-faint shrink-0">×{u.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                <div className="border-t rule my-6" />
              </>
            )}

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
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setShowAbout(false)}>
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
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #6cb8e4 0%, #a8d8eb 40%, #f8d9a8 100%)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <BluebirdMascot size={56} className="animate-pulse" />
            <div className="font-display text-sm" style={{ color: '#2a5680', fontWeight: 600, letterSpacing: '0.1em' }}>
              loading…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Species list drawer — full 774-species list with checkbox states
// ============================================================================
function SpeciesListDrawer({ seenSci, onClose, title, subtitle, eyebrow, restrictType, restrictValue }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'seen' | 'unseen'

  // Derive the restriction predicate from primitive props so we never have to
  // store a closure-over-state function in the parent's state. This avoids a
  // class of bugs around stale closures and surprising re-renders.
  const restrictFn = useMemo(() => {
    if (restrictType === 'code3') return (sci) => CODE_3_SCI.has(sci);
    if (restrictType === 'atrisk') return (sci) => AT_RISK_SCI.has(sci);
    if (restrictType === 'family') return (sci) => SCI_TO_FAMILY.get(sci) === restrictValue;
    return null;
  }, [restrictType, restrictValue]);

  // Filter species (optionally to a restricted subset), then group consecutively by family.
  // Output is an array of { family, items: [[common, sci], ...] } in taxonomic order.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];
    let currentFamily = null;
    let currentGroup = null;

    for (const [common, sci] of NATIVE_SPECIES) {
      if (restrictFn && !restrictFn(sci)) continue;
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
  }, [query, filter, seenSci, restrictFn]);

  // Counts scoped to the restriction (so the header reflects what the user actually sees)
  const { totalInScope, seenInScope } = useMemo(() => {
    let total = 0, seen = 0;
    for (const [, sci] of NATIVE_SPECIES) {
      if (restrictFn && !restrictFn(sci)) continue;
      total++;
      if (seenSci.has(sci)) seen++;
    }
    return { totalInScope: total, seenInScope: seen };
  }, [seenSci, restrictFn]);

  const hideFamilyHeader = groups.length === 1; // single-family view doesn't need redundant subheader

  const displayTitle = title || `The ${TOTAL}`;
  const displayEyebrow = eyebrow || 'Species Index';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="max-w-2xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff8e8', border: '3px solid #2a3445', boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">{displayEyebrow}</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>{displayTitle}</h2>
          <p className="ink-soft text-sm mb-4">
            <span className="moss font-mono" style={{ fontWeight: 600 }}>{seenInScope}</span> recorded
            {' · '}
            <span className="ink-faint font-mono">{totalInScope - seenInScope}</span> unseen
            {subtitle && (
              <>
                {' · '}
                <span className="ink-faint">{subtitle}</span>
              </>
            )}
          </p>

          {/* filter pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {[
              ['all', `All ${totalInScope}`],
              ['seen', `Seen (${seenInScope})`],
              ['unseen', `Unseen (${totalInScope - seenInScope})`],
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
                    {/* family subheader — hidden when the whole drawer is one family.
                        Cream sticky band with a yellow accent dot prefix, dark ink
                        text. The previous dark-green background was a holdover from
                        the legacy palette and looked wrong against the cream drawer. */}
                    {!hideFamilyHeader && (
                      <>
                        <div
                          className="sticky top-0 z-10 px-3 py-2.5 flex items-center justify-between gap-3"
                          style={{
                            background: 'rgba(255,248,232,0.96)',
                            backdropFilter: 'blur(8px)',
                            borderBottom: '1.5px solid rgba(42,52,69,0.18)',
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="shrink-0"
                              style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: '#ffe066', border: '2px solid #c9a01a',
                              }}
                            />
                            <h3 className="font-display text-base sm:text-lg truncate" style={{ fontWeight: 600, color: '#2a3445' }}>
                              {family}
                            </h3>
                          </div>
                          <span
                            className="font-mono text-[11px] tracking-wider whitespace-nowrap shrink-0"
                            style={{ fontWeight: 700, color: '#5a4a3e' }}
                          >
                            <span style={{ color: famSeen > 0 ? '#ff6b6b' : '#7a6a55' }}>{famSeen}</span>
                            <span style={{ color: '#7a6a55' }}> / {items.length}</span>
                          </span>
                        </div>
                      </>
                    )}
                    <ul>
                      {items.map(([common, sci]) => {
                        const seen = seenSci.has(sci);
                        const iucn = IUCN_STATUS[sci];
                        const badgeColor =
                          iucn === 'CR' ? '#a83a3a' :
                          iucn === 'EN' ? '#ff6b6b' :
                          iucn === 'VU' ? '#c9a01a' :
                          '#7a6a55'; // NT
                        return (
                          <li
                            key={sci}
                            className="species-row flex items-center gap-3 px-3 py-2.5 border-b"
                            style={{ borderColor: 'rgba(42,52,69,0.08)' }}
                          >
                            {seen ? (
                              <CheckSquare size={22} strokeWidth={2} className="shrink-0" style={{ color: '#5cba87' }} />
                            ) : (
                              <Square size={22} strokeWidth={1.5} className="shrink-0" style={{ color: '#a8a294' }} />
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
                            {iucn && (
                              <span
                                className="font-mono text-[10px] shrink-0 px-1.5 py-0.5 rounded"
                                style={{
                                  color: badgeColor,
                                  border: `1px solid ${badgeColor}`,
                                  fontWeight: 600,
                                  letterSpacing: '0.05em',
                                }}
                                title={
                                  iucn === 'CR' ? 'Critically Endangered' :
                                  iucn === 'EN' ? 'Endangered' :
                                  iucn === 'VU' ? 'Vulnerable' : 'Near Threatened'
                                }
                              >
                                {iucn}
                              </span>
                            )}
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
            {groups.reduce((n, g) => n + g.items.length, 0)} shown · {groups.length} {groups.length === 1 ? 'family' : 'families'}
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
// Families drawer — lists all 81 families with seen counts; tap to drill into
// the species list scoped to that family.
// ============================================================================
function FamiliesDrawer({ seenSci, onClose, onFamilyClick }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'started' | 'untouched'

  // Compute per-family totals & seen counts in one pass over NATIVE_SPECIES
  const families = useMemo(() => {
    const totals = new Map();
    const seens = new Map();
    for (const [, sci] of NATIVE_SPECIES) {
      const fam = SCI_TO_FAMILY.get(sci);
      if (!fam) continue;
      totals.set(fam, (totals.get(fam) || 0) + 1);
      if (seenSci.has(sci)) seens.set(fam, (seens.get(fam) || 0) + 1);
    }
    // Iterate FAMILY_BOUNDARIES to preserve taxonomic order
    const out = [];
    for (const [, family] of FAMILY_BOUNDARIES) {
      out.push({
        name: family,
        total: totals.get(family) || 0,
        seen: seens.get(family) || 0,
      });
    }
    return out;
  }, [seenSci]);

  const totalFamilies = families.length;
  const startedFamilies = families.filter(f => f.seen > 0).length;

  // Apply pill filter + search
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return families.filter(f => {
      if (filter === 'started' && f.seen === 0) return false;
      if (filter === 'untouched' && f.seen > 0) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [families, query, filter]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="max-w-2xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff8e8', border: '3px solid #2a3445', boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Diversity</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>Bird Families</h2>
          <p className="ink-soft text-sm mb-4">
            <span className="moss font-mono" style={{ fontWeight: 600 }}>{startedFamilies}</span> represented
            {' · '}
            <span className="ink-faint font-mono">{totalFamilies - startedFamilies}</span> untouched
            {' · '}
            <span className="ink-faint">tap to see species</span>
          </p>

          {/* filter pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {[
              ['all',       `All ${totalFamilies}`],
              ['started',   `Represented (${startedFamilies})`],
              ['untouched', `Untouched (${totalFamilies - startedFamilies})`],
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
              placeholder="Search families…"
              className="input-field rounded-full pl-9 pr-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        {/* family list */}
        <div className="relative flex-1 overflow-y-auto px-2 sm:px-4 py-2">
          {visible.length === 0 ? (
            <div className="text-center py-12 ink-faint text-sm">
              No matches{query ? ` for "${query}"` : ''}.
            </div>
          ) : (
            <ul className="font-body">
              {visible.map(f => {
                const started = f.seen > 0;
                const pct = f.total > 0 ? (f.seen / f.total) * 100 : 0;
                return (
                  <li key={f.name}>
                    <button
                      onClick={() => onFamilyClick(f.name)}
                      className="species-row w-full flex items-center gap-3 px-3 py-3 border-b text-left"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    >
                      {started ? (
                        <CheckSquare size={22} strokeWidth={1.75} className="moss shrink-0" />
                      ) : (
                        <Square size={22} strokeWidth={1.5} className="ink-faint shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[15px] leading-tight truncate ${started ? 'ink' : 'ink-soft'}`}
                          style={started ? { fontWeight: 600 } : undefined}
                        >
                          {f.name}
                        </div>
                        {started && (
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #4ade80 0%, #2dd4bf 100%)',
                            }} />
                          </div>
                        )}
                      </div>
                      <div className="font-mono text-[12px] tracking-wider whitespace-nowrap" style={{ fontWeight: 600 }}>
                        <span className={started ? 'ink' : 'ink-faint'}>{f.seen}</span>
                        <span className="ink-faint"> / {f.total}</span>
                      </div>
                      <ChevronRight size={16} className="ink-faint shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* footer */}
        <div className="relative px-6 py-3 border-t rule">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
            {visible.length} of {totalFamilies} families shown
          </span>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Tips drawer — fetches eBird's recent observations at the user's visited
// hotspots, then surfaces native species they've never seen elsewhere. Each
// hotspot's response is cached for 30 days, so repeat opens are instant.
// ============================================================================
function TipsDrawer({ apiKey, locations, seenSci, onClose, onOpenSettings }) {
  const [tips, setTips] = useState(null); // null=not loaded, []=empty result, [...]=results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  // Filter to locations the user has actually birded at (5+ native species).
  // This trims out drive-by checklists and keeps focus on their "patches".
  const targetLocations = useMemo(() => {
    if (!locations) return [];
    return locations
      .filter((l) => l.id && l.id.startsWith('L') && (l.species?.length || 0) >= 5)
      .sort((a, b) => (b.species?.length || 0) - (a.species?.length || 0));
  }, [locations]);

  // On first open, assemble tips from any cached historic-day data. Anything
  // not in cache is simply absent from the result — the user fetches to fill
  // it in. This makes drawer reopens instant when the cache is warm.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!targetLocations.length) {
        setTips([]);
        return;
      }
      const dates = lastNDays(7);
      const observersByKey = new Map();
      let cachedAny = false;
      let oldestTs = null;

      for (const loc of targetLocations) {
        for (const date of dates) {
          const raw = await storage.get(`ebird:hist:${loc.id}:${date.dateStr}`);
          if (!raw || !raw.timestamp) continue;
          if (Date.now() - raw.timestamp > HISTORIC_TTL_MS) continue;
          cachedAny = true;
          if (!oldestTs || raw.timestamp < oldestTs) oldestTs = raw.timestamp;
          for (const o of (raw.data || [])) {
            aggregateObservation(loc, o, observersByKey);
          }
        }
      }
      if (cancelled) return;

      if (!cachedAny) {
        setTips(null); // signal "not fetched yet"
        return;
      }

      const verified = [];
      for (const entry of observersByKey.values()) {
        if (entry.observers.size >= 2) verified.push(entry);
      }
      setTips(buildTipsFromVerified(verified));
      setCacheTimestamp(oldestTs);
    })();
    return () => { cancelled = true; };
  }, [targetLocations.length]);

  // Builds a list of the last N days as {year, month, day, dateStr} objects.
  function lastNDays(n) {
    const out = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      out.push({ year: y, month: m, day, dateStr });
    }
    return out;
  }

  // Add a single historic observation record into the (hotspot, species) map.
  // Pulled out so the on-mount cache load and the fresh fetch path share logic.
  function aggregateObservation(loc, o, observersByKey) {
    if (!o.sciName || !NATIVE_SCI.has(o.sciName)) return;
    if (seenSci.has(o.sciName)) return;
    const key = `${loc.id}|${o.sciName}`;
    let entry = observersByKey.get(key);
    if (!entry) {
      entry = {
        sciName: o.sciName,
        comName: o.comName || o.sciName,
        observers: new Set(),
        mostRecent: o.obsDt,
        locId: loc.id,
        locName: loc.name || loc.id,
      };
      observersByKey.set(key, entry);
    }
    // Prefer userDisplayName (the human-readable submitter); fall back to subId
    // (the unique checklist ID) when the name is suppressed by privacy settings
    // or missing from older records.
    const obsKey = o.userDisplayName
      ? `n:${o.userDisplayName}`
      : (o.subId ? `s:${o.subId}` : null);
    if (obsKey) entry.observers.add(obsKey);
    if (o.obsDt && o.obsDt > entry.mostRecent) entry.mostRecent = o.obsDt;
  }

  async function fetchAll(forceRefresh = false) {
    if (!apiKey) {
      setError('Add your eBird API key in Settings first.');
      return;
    }
    if (!targetLocations.length) return;

    setLoading(true);
    setError(null);

    try {
      // Build the task list: each hotspot × each of the last 7 days. We use
      // the historic-day endpoint because every other "recent" endpoint dedupes
      // to one observation per species per location, which makes counting
      // independent observers impossible. Historic returns every individual
      // submission for that hotspot on that date — exactly what we need.
      const DAYS = 7;
      const dates = lastNDays(DAYS);
      const tasks = [];
      for (const loc of targetLocations) {
        for (const date of dates) {
          tasks.push({ loc, date });
        }
      }

      setProgress({ phase: 'verify', done: 0, total: tasks.length });

      const observersByKey = new Map();
      const concurrency = 3;

      for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);
        const results = await Promise.all(batch.map(async (t) => {
          let hist = forceRefresh ? null : await getCachedHistoric(t.loc.id, t.date.dateStr);
          if (!hist) {
            try {
              hist = await fetchHistoricAtLocation(
                t.loc.id, t.date.year, t.date.month, t.date.day, apiKey
              );
              await setCachedHistoric(t.loc.id, t.date.dateStr, hist);
            } catch (e) {
              console.warn('historic fetch failed for', t.loc.id, t.date.dateStr, e);
              hist = [];
            }
          }
          return { loc: t.loc, hist };
        }));

        for (const { loc, hist } of results) {
          for (const o of hist) {
            aggregateObservation(loc, o, observersByKey);
          }
        }

        setProgress({
          phase: 'verify',
          done: Math.min(i + concurrency, tasks.length),
          total: tasks.length,
        });
        await new Promise((r) => setTimeout(r, 60));
      }

      // Filter to species seen by 2+ distinct observers at the same hotspot.
      const verified = [];
      for (const entry of observersByKey.values()) {
        if (entry.observers.size >= 2) verified.push(entry);
      }

      setTips(buildTipsFromVerified(verified));
      setCacheTimestamp(Date.now());
    } catch (e) {
      setError(e.message || 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }

  // Build the per-species tip list from verified candidate entries.
  function buildTipsFromVerified(verified) {
    const bySpecies = new Map();
    for (const v of verified) {
      let entry = bySpecies.get(v.sciName);
      if (!entry) {
        entry = { sci: v.sciName, common: v.comName, locations: [] };
        bySpecies.set(v.sciName, entry);
      }
      entry.locations.push({
        locId: v.locId,
        locName: v.locName,
        obsDt: v.mostRecent,
        observerCount: v.observers.size,
      });
    }
    const arr = [];
    for (const entry of bySpecies.values()) {
      entry.locations.sort((a, b) => b.obsDt.localeCompare(a.obsDt));
      entry.mostRecent = entry.locations[0].obsDt;
      arr.push(entry);
    }
    arr.sort((a, b) => b.mostRecent.localeCompare(a.mostRecent));
    return arr;
  }

  // Helpers for date display
  function relDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} wk ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const hasApiKey = !!apiKey;
  const hasLocations = targetLocations.length > 0;
  const shownTips = (tips || []).slice(0, 40);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="max-w-2xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff8e8', border: '3px solid #2a3445', boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Hints</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>Birds you've missed</h2>
          <p className="ink-soft text-sm">
            Recently reported at your eBird hotspots — but not yet on your life list
          </p>
        </div>

        {/* body */}
        <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {/* No locations available */}
          {!hasLocations && (
            <div className="surface-1 rounded-2xl p-5 text-center">
              <h3 className="font-display ink text-lg mb-2" style={{ fontWeight: 600 }}>Re-upload your CSV</h3>
              <p className="text-sm ink-soft leading-relaxed mb-4">
                Tips need eBird Location IDs from your checklist data — a column that
                wasn't captured in earlier versions. Re-upload your <span className="font-mono text-xs">MyEBirdData.csv</span> from
                Settings to enable hints.
              </p>
              <p className="text-xs ink-faint">
                You won't lose any data — your count, sightings, and map stay the same.
              </p>
            </div>
          )}

          {/* No API key */}
          {hasLocations && !hasApiKey && (
            <div className="surface-1 rounded-2xl p-5 mb-3">
              <div className="font-mono text-[10px] ink-faint tracking-widest uppercase mb-2">Step 1</div>
              <h3 className="font-display ink text-lg mb-2" style={{ fontWeight: 600 }}>Connect your eBird API key</h3>
              <p className="text-sm ink-soft leading-relaxed mb-3">
                Tips use eBird's public API to see what's been spotted at your {targetLocations.length} regular hotspots.
                The key is free, takes a minute, and is stored only on this device.
              </p>
              <div className="text-xs ink-faint mb-3">
                Go to <a href="https://ebird.org/api/keygen" target="_blank" rel="noopener noreferrer" className="rust underline">ebird.org/api/keygen</a>,
                paste the key into Settings.
              </div>
              <button
                onClick={() => { onOpenSettings(); }}
                className="btn-ink rounded-full px-5 py-2 text-sm inline-flex items-center gap-2"
              >
                <Settings size={14} />
                Open Settings
              </button>
            </div>
          )}

          {/* Have key, nothing fetched yet */}
          {hasLocations && hasApiKey && tips === null && !loading && (
            <div className="surface-1 rounded-2xl p-5 mb-3 text-center">
              <h3 className="font-display ink text-lg mb-2" style={{ fontWeight: 600 }}>Ready to scan</h3>
              <p className="text-sm ink-soft leading-relaxed mb-4">
                We'll read the last 7 days of checklist history at your {targetLocations.length} most-birded
                hotspots and surface any native species reported by 2+ separate observers — filtering out
                vagrants, one-off sightings, and single-birder reports.
              </p>
              <p className="text-xs ink-faint mb-4">
                ~{Math.ceil((targetLocations.length * 7) / 3 * 0.15)}s on first run; instant after that.
              </p>
              <button
                onClick={() => fetchAll(false)}
                className="btn-ink rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Find missed birds
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="surface-1 rounded-2xl p-5 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw size={16} className="rust animate-spin" />
                <span className="font-display ink text-sm" style={{ fontWeight: 600 }}>
                  Reading hotspot histories…
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%',
                    background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
                  }}
                />
              </div>
              <div className="font-mono text-[10px] ink-faint tracking-wider mt-2">
                {progress.done} / {progress.total} day-records
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl p-4 mb-3 text-sm" style={{
              background: 'rgba(127, 29, 29, 0.30)',
              border: '1px solid rgba(248, 113, 113, 0.25)',
              color: '#fda4af',
            }}>
              {error}
            </div>
          )}

          {/* Empty result */}
          {tips !== null && shownTips.length === 0 && !loading && (
            <div className="text-center py-8 ink-faint text-sm">
              No corroborated missed birds in the last 7 days. Only species reported
              by ≥ 2 separate observers at the same hotspot count — vagrants and
              single-birder reports are filtered out.
            </div>
          )}

          {/* Tips list */}
          {shownTips.length > 0 && (
            <>
              {cacheTimestamp && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
                    {shownTips.length} {shownTips.length === 1 ? 'species' : 'species'} · as of {relDate(new Date(cacheTimestamp).toISOString())}
                  </span>
                  <button
                    onClick={() => fetchAll(true)}
                    disabled={loading}
                    className="btn-ghost rounded-full px-3 py-1 text-[11px] inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              )}
              <ul>
                {shownTips.map((t) => (
                  <li
                    key={t.sci}
                    className="species-row flex items-start gap-3 px-3 py-3 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ background: '#fb923c', boxShadow: '0 0 8px rgba(249,115,22,0.6)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <div className="text-[15px] ink leading-tight" style={{ fontWeight: 600 }}>{t.common}</div>
                        {t.locations.length > 1 && (
                          <span className="font-mono text-[10px] rust" style={{ fontWeight: 600 }}>
                            ×{t.locations.length}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] ink-faint mt-0.5 truncate" style={{ fontStyle: 'italic' }}>{t.sci}</div>
                      {t.locations.length === 1 ? (
                        <div className="text-xs ink-soft mt-1">
                          <span className="rust" style={{ fontWeight: 500 }}>{relDate(t.locations[0].obsDt)}</span>
                          <span className="ink-faint"> · </span>
                          {t.locations[0].locName}
                          <span className="ink-faint font-mono ml-1">
                            ({t.locations[0].observerCount} observers)
                          </span>
                        </div>
                      ) : (
                        <ul className="mt-1.5 space-y-1">
                          {t.locations.map((l) => (
                            <li key={l.locId} className="text-xs ink-soft flex items-baseline gap-2">
                              <span className="rust shrink-0" style={{ fontWeight: 500, minWidth: '4.5em' }}>
                                {relDate(l.obsDt)}
                              </span>
                              <span className="ink-faint truncate flex-1">{l.locName}</span>
                              <span className="ink-faint font-mono shrink-0">
                                {l.observerCount} obs
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* footer */}
        <div className="relative px-4 sm:px-6 py-3 border-t rule flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
            {targetLocations.length} hotspot{targetLocations.length === 1 ? '' : 's'} scanned
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
// Install prompt drawer — manual instructions when the browser cannot trigger
// an install prompt for us (iOS Safari, or desktop without PWA install support).
// ============================================================================
function InstallPromptDrawer({ onClose }) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="surface-2 rounded-2xl max-w-md w-full p-7 relative"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink transition-colors">
          <X size={18} />
        </button>

        <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Install</div>
        <h2 className="font-display ink text-2xl mb-1" style={{ fontWeight: 700 }}>Add to Home Screen</h2>
        <p className="ink-soft text-sm mb-6">
          Get an app-like experience with quick access from your home screen — same data, just one tap.
        </p>

        {isIOS ? (
          <div className="space-y-4">
            <p className="text-xs ink-faint">
              {isSafari ? 'In Safari:' : "iOS requires Safari for this — open this page in Safari, then:"}
            </p>
            <ol className="space-y-3 text-sm ink-soft">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>1</span>
                <span>
                  Tap the <span className="inline-flex items-center px-2 py-0.5 rounded" style={{ background: 'rgba(95,168,211,0.15)', border: '1.5px solid #5fa8d3' }}>
                    <Share2 size={13} className="teal mr-1" />
                    <span className="teal text-xs" style={{ fontWeight: 600 }}>Share</span>
                  </span> button at the bottom of Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>2</span>
                <span>
                  Scroll down and tap <span className="inline-flex items-center px-2 py-0.5 rounded" style={{ background: 'rgba(249,115,22,0.10)' }}>
                    <Plus size={13} className="rust mr-1" />
                    <span className="rust text-xs" style={{ fontWeight: 600 }}>Add to Home Screen</span>
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>3</span>
                <span>Tap <span className="ink" style={{ fontWeight: 600 }}>Add</span> in the top right</span>
              </li>
            </ol>
          </div>
        ) : isAndroid ? (
          <div className="space-y-3 text-sm ink-soft">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>1</span>
                <span>Tap the <span className="ink" style={{ fontWeight: 600 }}>⋮ menu</span> in your browser's top right</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>2</span>
                <span>Select <span className="ink" style={{ fontWeight: 600 }}>Install app</span> or <span className="ink" style={{ fontWeight: 600 }}>Add to Home Screen</span></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>3</span>
                <span>Confirm to add the icon</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-sm ink-soft">
            <p>
              Look for an install icon in your browser's address bar, or use the browser menu to find
              "Install Birder" or "Add to Home Screen".
            </p>
            <p className="text-xs ink-faint">For the best experience, open this site on your phone (iPhone or Android).</p>
          </div>
        )}

        <div className="border-t rule mt-6 pt-4 flex justify-end">
          <button onClick={onClose} className="btn-ghost rounded-full px-5 py-2 text-sm">Got it</button>
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

// ---------- Regional zoom ----------
// FIPS code → 2-letter postal abbreviation. us-atlas uses FIPS codes as the
// `id` field on each state geometry.
const FIPS_TO_ABBR = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA',
  '20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
  '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM',
  '36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI',
  '45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
  '54':'WV','55':'WI','56':'WY',
};
const ABBR_TO_FIPS = Object.fromEntries(Object.entries(FIPS_TO_ABBR).map(([f,a]) => [a,f]));

// 11-region partition of the country. Designed to honor common geographic
// understanding (PNW, Rockies, Plains, etc.) while keeping the regions
// reasonably balanced. Alaska and Hawaii are each their own region because
// grouping them with the Pacific states forces enormous bounding boxes that
// shrink the contiguous states to invisibility when zoomed. Great Plains is
// split into a Northern half (ND/SD/NE/KS) and a Southern half (TX/OK) for
// the same reason: with TX and OK in the same group, the region's bbox spans
// nearly the entire latitude range of the lower 48 and there's almost no
// zoom benefit.
const REGIONS = [
  { id: 'pnw', name: 'Pacific Northwest', states: ['WA','OR','ID'] },
  { id: 'cal', name: 'California',        states: ['CA'] },
  { id: 'ak',  name: 'Alaska',            states: ['AK'] },
  { id: 'hi',  name: 'Hawaii',            states: ['HI'] },
  { id: 'sw',  name: 'Southwest',         states: ['AZ','NM','UT','NV'] },
  { id: 'rm',  name: 'Rocky Mountains',   states: ['MT','WY','CO'] },
  { id: 'gp',  name: 'Great Plains',      states: ['ND','SD','NE','KS'] },
  { id: 'sp',  name: 'Southern Plains',   states: ['OK','TX'] },
  { id: 'mw',  name: 'Midwest',           states: ['MN','IA','MO','WI','IL','MI','IN','OH'] },
  { id: 'ne',  name: 'Northeast',         states: ['PA','NY','NJ','CT','RI','MA','VT','NH','ME','DE','MD','DC','WV'] },
  { id: 'se',  name: 'Southeast',         states: ['AR','LA','MS','AL','GA','FL','TN','KY','NC','SC','VA'] },
];
const STATE_TO_REGION = {};
for (const r of REGIONS) for (const s of r.states) STATE_TO_REGION[s] = r.id;
const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// Pre-compute each region's merged polygon (used both as a clip outline when
// zoomed AND for point-in-polygon filtering of heat points).
const REGION_GEOMETRY = {};
for (const r of REGIONS) {
  const fipsSet = new Set(r.states.map(a => ABBR_TO_FIPS[a]).filter(Boolean));
  const geoms = statesTopo.objects.states.geometries.filter(g => fipsSet.has(g.id));
  REGION_GEOMETRY[r.id] = merge(statesTopo, geoms);
}

// Borders BETWEEN different regions — these get a thicker stroke on the full
// US view so the regions read as distinct clickable areas.
const REGION_BORDERS = mesh(statesTopo, statesTopo.objects.states, (a, b) => {
  return STATE_TO_REGION[FIPS_TO_ABBR[a.id]] !== STATE_TO_REGION[FIPS_TO_ABBR[b.id]];
});

// Albers USA projection sized for a 700×440 viewBox
const MAP_W = 700;
const MAP_H = 440;
const PROJECTION = geoAlbersUsa().scale(900).translate([MAP_W / 2, MAP_H / 2]);
const PATH = geoPath(PROJECTION);
// Identity path (no projection) for rendering contour features whose coords
// are already in screen pixels.
const PIXEL_PATH = geoPath();

// Per-region projection factories.
//
// Plain geoAlbers() carries the defaults tuned for the conterminous US:
// standard parallels at 29.5°N and 45.5°N, central meridian rotated to 96°W.
// When you then fitExtent() it onto Alaska's ~52–71°N range or Hawaii's
// ~19–22°N range, the conic fan is the wrong shape for those latitudes and
// you get the skew you'd see if you tried to flatten a globe from the
// perspective of someone standing over Kansas.
//
// The fix is the same one d3.geoAlbersUsa uses internally for its AK/HI
// composite insets: give each region its own conic with parallels that
// bracket the region's actual latitude range and a rotation that puts the
// region's central longitude on the projection's central meridian. These
// magic numbers match d3-composite-projections' Albers presets.
//
// For every other region the lower-48 defaults are close enough; only AK and
// HI sit far enough from those parallels for the distortion to be visible.
const REGION_PROJ_FN = {
  ak: () => geoAlbers().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]),
  hi: () => geoAlbers().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]),
};

// Warm sequential color scale: transparent → bright peach red.
// `t` in [0, 1]. The lowest stop is fully transparent so the outer fringe of
// each hotspot fades naturally into the map background instead of stopping at
// a hard 60%-alpha edge.
function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  // Classic thermal-imaging ramp: blue → green → yellow → orange → dark red.
  // Reads like a temperature gradient, so the visual story tells itself:
  // cool-blue haze at the fringe of activity, warm-red at hotspot cores.
  //
  // Tuned for the pale mint basemap (#c8e6c8):
  // - The cool end uses a lighter sky-blue at low opacity so a single
  //   low-density sighting reads as a soft wash that blends into the
  //   open landscape rather than a hard dark dot competing for attention.
  // - The green band uses a darker, more saturated green than the mint
  //   so it stays distinct rather than blending into the basemap.
  // - Warm bands (yellow, orange, dark red) keep high opacity so cluster
  //   cores still bloom strongly through the spectrum.
  // - The very edge stays transparent so contours feather softly into
  //   the basemap rather than terminating in a hard line.
  const stops = [
    { at: 0.00, c: [255, 245, 225, 0.00] }, // transparent cream fringe
    { at: 0.10, c: [105, 150, 200, 0.28] }, // soft sky-blue haze (faded)
    { at: 0.25, c: [ 55, 130, 200, 0.55] }, // mid blue
    { at: 0.42, c: [ 50, 160, 100, 0.78] }, // saturated green
    { at: 0.60, c: [225, 195,  55, 0.88] }, // yellow
    { at: 0.80, c: [232, 130,  45, 0.92] }, // orange
    { at: 1.00, c: [135,  25,  25, 0.95] }, // dark red core
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

function SightingsMapView({
  pointsAll,
  pointsFirst,
  userCount,
  familiesSeen = 0,
  code3Seen = 0,
  atRiskSeen = 0,
  locationCount = 0,
  regionNativeCount = {},
  locations = [],
  onBack,
}) {
  const svgContainerRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  // Filter mode. 'all' = aggregate species count per location (the original
  // heatmap; biased toward most-birded spots). 'first' = each species's
  // first-found location, weighted by how many species you discovered there.
  // The first-sightings view flattens the heat because repeat visits to the
  // same hotspot stop contributing once you've seen everything there.
  const [mode, setMode] = useState('all');
  // Active region (null = full USA). When set, the projection refits to the
  // region's geometry and the heatmap is recomputed using only points inside
  // that region — so a Charlotte home patch can't pollute the Pacific NW view.
  const [region, setRegion] = useState(null);
  const points = (mode === 'first' ? pointsFirst : pointsAll) || [];
  const firstAvailable = Array.isArray(pointsFirst) && pointsFirst.length > 0;

  // Build the active projection AND its viewBox dimensions.
  //
  // Two strategies for regional zoom:
  //
  // 1. Lower 48 regions: target a fixed 1.3 miles-per-pixel resolution at the
  //    region's centroid. Each region's viewBox is sized to contain the
  //    geometry at that fixed scale, so a heat blob in Charlotte and a heat
  //    blob in Seattle represent the same real-world radius (≈ 6.5 mi for
  //    the 5-pixel bandwidth). This makes cross-region comparison meaningful
  //    and prevents tiny regions from over-zooming while large ones starve
  //    for detail.
  //
  // 2. Alaska and Hawaii: keep the existing fit-to-viewBox behavior with
  //    their region-specific conic params (REGION_PROJ_FN). AK and HI are
  //    each one state with very specific geometry that needs custom handling,
  //    and a fixed 1.3 mi/px target would either make AK enormous (it's the
  //    size of two and a half Texases) or HI tiny.
  const { activeProj, activePath, activeOutline, activeName, viewBoxW, viewBoxH } = useMemo(() => {
    if (!region) {
      return {
        activeProj: PROJECTION,
        activePath: PATH,
        activeOutline: NATION_OUTLINE,
        activeName: 'United States',
        viewBoxW: MAP_W,
        viewBoxH: MAP_H,
      };
    }
    const geo = REGION_GEOMETRY[region];
    const meta = REGION_BY_ID[region];
    if (!geo || !meta) {
      return {
        activeProj: PROJECTION, activePath: PATH,
        activeOutline: NATION_OUTLINE, activeName: 'United States',
        viewBoxW: MAP_W, viewBoxH: MAP_H,
      };
    }
    const PAD = 8;

    // Strategy 2: AK and HI use their custom conic factories with fit-to-viewBox.
    if (REGION_PROJ_FN[region]) {
      const projFactory = REGION_PROJ_FN[region];
      const trial = projFactory();
      const trialBounds = geoPath(trial).bounds(geo);
      const trialW = trialBounds[1][0] - trialBounds[0][0];
      const trialH = trialBounds[1][1] - trialBounds[0][1];
      const aspect = trialW / trialH;
      const LONG_DIM = 700, MIN_SHORT_DIM = 280;
      let vbW, vbH;
      if (aspect >= 1) {
        vbW = LONG_DIM; vbH = Math.max(MIN_SHORT_DIM, Math.round(LONG_DIM / aspect));
      } else {
        vbH = LONG_DIM; vbW = Math.max(MIN_SHORT_DIM, Math.round(LONG_DIM * aspect));
      }
      const p = projFactory().fitExtent(
        [[PAD, PAD], [vbW - PAD, vbH - PAD]],
        geo,
      );
      return {
        activeProj: p, activePath: geoPath(p),
        activeOutline: geo, activeName: meta.name,
        viewBoxW: vbW, viewBoxH: vbH,
      };
    }

    // Strategy 1: lower-48 regions get a fixed 1.3 mi/px projection inside a
    // fixed-size viewBox.
    //
    // The fixed viewBox (FIXED_VB × FIXED_VB) is sized to comfortably hold the
    // largest region (Southeast, which needs ~839×819 at 1.3 mi/px). Smaller
    // regions render centered inside that same canvas, with the rest of the
    // SVG transparent so the card's dark background shows through — no white
    // bands, no visible region boundary, just smaller-looking states sitting
    // in the same dark map area.
    //
    // The point of this is proportional rendering: because every region uses
    // the same viewBox size, the SVG always shrinks to fit the card at the
    // same scale factor, so 1 viewBox pixel = the same on-screen pixels in
    // every region. Combined with the fixed 1.3 mi/px viewBox scale, that
    // means 1 real-world mile = the same number of on-screen pixels in every
    // region. Florida looks bigger than Kansas because it IS bigger; the
    // mismatch where small regions like Great Plains visually outgrew large
    // ones like Southeast goes away.
    const TARGET_MPP = 1.3;
    const MI_PER_DEG_LAT = 69.0;
    const FIXED_VB = 900;
    const k = (MI_PER_DEG_LAT / TARGET_MPP) * (180 / Math.PI);
    const centroid = geoCentroid(geo);

    // Center the projection on the region's centroid so distortion is
    // minimized there (the spot we're measuring mi/px against).
    let p = geoAlbers()
      .scale(k)
      .rotate([-centroid[0], 0])  // central meridian at centroid longitude
      .center([0, centroid[1]])    // visual center at centroid latitude
      .translate([0, 0]);

    // Project the geometry, then translate so the geometry's bbox CENTER
    // lands at the viewBox center. The geometry ends up centered in the
    // FIXED_VB square; smaller regions are surrounded by transparent
    // space that reveals the card background.
    const bnd = geoPath(p).bounds(geo);
    const geoCenterX = (bnd[0][0] + bnd[1][0]) / 2;
    const geoCenterY = (bnd[0][1] + bnd[1][1]) / 2;
    p = p.translate([FIXED_VB / 2 - geoCenterX, FIXED_VB / 2 - geoCenterY]);

    return {
      activeProj: p,
      activePath: geoPath(p),
      activeOutline: geo,
      activeName: meta.name,
      viewBoxW: FIXED_VB,
      viewBoxH: FIXED_VB,
    };
  }, [region]);

  // Project points to pixel space. Each point is [lng, lat, weight] where
  // weight is unique species count at that location. When zoomed to a region,
  // points are first filtered to those inside the region's geometry so the
  // density contours represent only that region's data.
  const { contours, projectedCount, maxValue, totalSpeciesAcrossLocations, totalLocations } = useMemo(() => {
    const projected = [];
    let totalW = 0;
    const regionGeo = region ? REGION_GEOMETRY[region] : null;
    for (const p of points) {
      const lng = p[0], lat = p[1];
      const w = (p.length >= 3 && Number.isFinite(p[2])) ? p[2] : 1;
      // Region filter: skip points outside the active region's geometry.
      // geoContains operates in lng/lat space against the polygon.
      if (regionGeo && !geoContains(regionGeo, [lng, lat])) continue;
      const xy = activeProj([lng, lat]);
      if (xy && !isNaN(xy[0]) && !isNaN(xy[1])) {
        projected.push([xy[0], xy[1], w]);
        totalW += w;
      }
    }
    if (projected.length === 0) {
      return { contours: [], projectedCount: 0, maxValue: 0, totalSpeciesAcrossLocations: 0, totalLocations: 0 };
    }
    const dc = contourDensity()
      .x((d) => d[0])
      .y((d) => d[1])
      .weight((d) => Math.sqrt(d[2]))
      .size([viewBoxW, viewBoxH])
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
  }, [points, region, activeProj, viewBoxW, viewBoxH]);

  // Highest single-location diversity (useful in the header)
  const peakDiversity = useMemo(() => {
    let m = 0;
    const regionGeo = region ? REGION_GEOMETRY[region] : null;
    for (const p of points) {
      if (regionGeo && !geoContains(regionGeo, [p[0], p[1]])) continue;
      const w = (p.length >= 3 && Number.isFinite(p[2])) ? p[2] : 1;
      if (w > m) m = w;
    }
    return m;
  }, [points, region]);

  // Effective native-species count per region.
  //
  // Preferred source: the parser's pre-computed regionNativeCount in csvMeta.
  // This is exact because it reads every CSV row's State/Province directly.
  //
  // Fallback: compute on the fly from the `locations` array — each location
  // has its native species set, so we union them into per-region sets using
  // geoContains for assignment. This covers the case where the user uploaded
  // their CSV under an older parser version that didn't yet emit
  // regionNativeCount, so the regional counter shows real numbers without
  // forcing another re-upload. Only the lng/lat → region lookup runs at
  // mount, and only when the parser data is missing.
  const effectiveRegionNativeCount = useMemo(() => {
    if (regionNativeCount && Object.keys(regionNativeCount).length > 0) {
      return regionNativeCount;
    }
    if (!Array.isArray(locations) || locations.length === 0) return {};
    const sets = {};
    for (const loc of locations) {
      if (!loc || !Array.isArray(loc.species) || loc.species.length === 0) continue;
      for (const r of REGIONS) {
        const geo = REGION_GEOMETRY[r.id];
        if (geo && geoContains(geo, [loc.lng, loc.lat])) {
          if (!sets[r.id]) sets[r.id] = new Set();
          for (const s of loc.species) sets[r.id].add(s);
          break; // each location belongs to exactly one region
        }
      }
    }
    const out = {};
    for (const [id, set] of Object.entries(sets)) out[id] = set.size;
    return out;
  }, [regionNativeCount, locations]);

  // ---- Share card: 1080×1920 portrait PNG (9:16) sized for IG/Stories ----
  async function shareCard() {
    if (sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      const svgEl = svgContainerRef.current?.querySelector('svg');
      if (!svgEl) throw new Error('Map not ready');

      // Pre-warm fonts so canvas draws Montserrat, not a fallback
      try {
        if (document.fonts) {
          await Promise.all([
            document.fonts.load('700 280px Fredoka'),
            document.fonts.load('700 56px Fredoka'),
            document.fonts.load('700 42px Fredoka'),
            document.fonts.load('600 36px Fredoka'),
            document.fonts.load('700 28px Fredoka'),
            document.fonts.load('700 64px Fredoka'),
          ]);
        }
      } catch {
        // Non-fatal; canvas will fall back to system-ui
      }

      // Clone the SVG and strip the very-subtle state fills — those rgba
      // white-on-dark polygons create a barely-visible lighter rectangle around
      // the US that breaks the dark-on-dark blend we want for the share card.
      // The state borders (drawn separately) still trace the actual US shape.
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.querySelectorAll('path[fill="rgba(255,255,255,0.03)"]').forEach((p) => p.remove());

      const xml = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Load SVG into an Image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('SVG load failed'));
        img.src = svgUrl;
      });

      // 9:16 portrait — Instagram Stories / Reels / TikTok native dimensions
      const W = 1080, H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // --- helpers ---
      function rrPath(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      }
      function drawGlass(x, y, w, h, r) {
        // Glassy fill: very subtle top-to-bottom highlight
        rrPath(x, y, w, h, r);
        const fillGrad = ctx.createLinearGradient(0, y, 0, y + h);
        fillGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        fillGrad.addColorStop(1, 'rgba(255,248,232,0.95)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
        // Beveled border: brighter at top, dimmer at bottom — the "Liquid Glass" cue
        rrPath(x, y, w, h, r);
        const borderGrad = ctx.createLinearGradient(0, y, 0, y + h);
        borderGrad.addColorStop(0, 'rgba(42,52,69,0.3)');
        borderGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
        borderGrad.addColorStop(1, 'rgba(255,255,255,0.03)');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // === Background: subtle vertical gradient (lighter top → deeper bottom) ===
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#6cb8e4');
      bgGrad.addColorStop(0.35, '#a8d8eb');
      bgGrad.addColorStop(1, '#f8d9a8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Warm orange halo behind the hero card for depth
      const halo = ctx.createRadialGradient(W / 2, 420, 80, W / 2, 420, 700);
      halo.addColorStop(0, 'rgba(255, 224, 102, 0.20)');
      halo.addColorStop(0.5, 'rgba(255, 224, 102, 0.08)');
      halo.addColorStop(1, 'rgba(255, 224, 102, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      const count = userCount ?? 0;
      const pct = (count / TOTAL) * 100;
      const cx = W / 2;

      // === Top-left logo: feather + BIRDER wordmark ===
      ctx.save();
      ctx.translate(60, 60);
      ctx.scale(2.1, 2.1);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const feather = new Path2D('M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z');
      ctx.stroke(feather);
      ctx.beginPath();
      ctx.moveTo(16, 8);  ctx.lineTo(2, 22);  ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(17.5, 15); ctx.lineTo(9, 15); ctx.stroke();
      ctx.restore();

      ctx.font = '700 56px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#2a3445';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Birder', 130, 100);

      // === Hero glass card: count + percentage ===
      const heroX = 60, heroY = 180, heroW = 960, heroH = 480;
      drawGlass(heroX, heroY, heroW, heroH, 36);

      ctx.textAlign = 'center';

      // Eyebrow inside hero
      ctx.font = '700 18px Nunito, system-ui, sans-serif';
      ctx.fillStyle = '#5fa8d3';
      ctx.fillText('LIFE LIST', cx, heroY + 50);

      // Giant count
      ctx.font = '700 260px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText(`${count}`, cx, heroY + 280);

      // "of 774 native US birds"
      ctx.font = '600 36px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#5a4a3e';
      ctx.fillText(`of ${TOTAL} native US birds`, cx, heroY + 345);

      // Orange accent line
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 56, heroY + 388);
      ctx.lineTo(cx + 56, heroY + 388);
      ctx.stroke();

      // Percentage (orange)
      ctx.font = '700 40px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText(`${pct.toFixed(1)}% complete`, cx, heroY + 440);

      // === Stats strip: three small glass cards ===
      const stripY = heroY + heroH + 30; // y=690
      const stripH = 150;
      const gap = 12;
      const cardW = (W - 60 * 2 - gap * 2) / 3;

      const stats = [
        {
          label: 'FAMILIES',
          value: `${familiesSeen}`,
          sub: `of ${FAMILY_BOUNDARIES.length}`,
          color: '#2a3445',
        },
        {
          label: 'AT-RISK',
          value: `${atRiskSeen}`,
          sub: 'IUCN threatened',
          color: '#ff6b6b',
        },
        {
          label: 'LOCATIONS',
          value: locationCount.toLocaleString(),
          sub: 'birded',
          color: '#2a3445',
        },
      ];

      stats.forEach((s, i) => {
        const x = 60 + i * (cardW + gap);
        drawGlass(x, stripY, cardW, stripH, 22);

        const cxStat = x + cardW / 2;
        // Label (mono, eyebrow)
        ctx.font = '700 14px Nunito, system-ui, sans-serif';
        ctx.fillStyle = '#5a4a3e';
        ctx.fillText(s.label, cxStat, stripY + 36);
        // Big number
        ctx.font = '700 64px Fredoka, system-ui, sans-serif';
        ctx.fillStyle = s.color;
        ctx.fillText(s.value, cxStat, stripY + 100);
        // Sub-label
        ctx.font = '600 14px Nunito, system-ui, sans-serif';
        ctx.fillStyle = '#7a6a55';
        ctx.fillText(s.sub, cxStat, stripY + 125);
      });

      // === Map with feathered edge fade ===
      const mapW = 1040;
      const mapH = Math.round(mapW * (MAP_H / MAP_W));
      const mapX = (W - mapW) / 2;
      const mapY = stripY + stripH + 40; // y=920

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mapW;
      tempCanvas.height = mapH;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0, mapW, mapH);

      tempCtx.globalCompositeOperation = 'destination-out';
      const fadePx = Math.round(mapW * 0.08);
      let fg = tempCtx.createLinearGradient(0, 0, fadePx, 0);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(0, 0, fadePx, mapH);
      fg = tempCtx.createLinearGradient(mapW - fadePx, 0, mapW, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(mapW - fadePx, 0, fadePx, mapH);
      fg = tempCtx.createLinearGradient(0, 0, 0, fadePx);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(0, 0, mapW, fadePx);
      fg = tempCtx.createLinearGradient(0, mapH - fadePx, 0, mapH);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(0, mapH - fadePx, mapW, fadePx);

      ctx.drawImage(tempCanvas, mapX, mapY);

      // === Caption + CTA at the bottom ===
      ctx.textAlign = 'center';
      ctx.font = '700 42px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#2a3445';
      ctx.fillText(`How many have YOU found?`, cx, 1730);

      ctx.font = '700 28px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText(`Find yours at Birder`, cx, 1782);

      URL.revokeObjectURL(svgUrl);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
      if (!blob) throw new Error('Image encoding failed');

      const file = new File([blob], 'birder.png', { type: 'image/png' });

      // Prefer the Web Share API on mobile (iOS 15+, recent Android)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Birder',
          text: `${count}/${TOTAL} native US bird species · ${pct.toFixed(1)}%`,
        });
      } else {
        // Fallback for older iOS, desktop, or browsers without file-sharing
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `birder-${count}-of-${TOTAL}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        // AbortError just means the user dismissed the share sheet — not an error
        setShareError(err?.message || 'Share failed');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className="relative max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col"
      style={{ minHeight: '100vh' }}
    >
      {/* ===== Map page header — chunky mint banner =====
          Mint-green gradient with thick dark-mint border + offset shadow.
          The back button reads "Home" (matching the homepage's chunky vibe)
          rather than "Census" or "Birder" wordmarking — quicker to parse on
          a small screen and consistent with how Animal Crossing menus label
          their back actions. */}
      <header
        className="anim-1 relative flex items-center justify-between mb-3 shrink-0"
        style={{
          background: 'linear-gradient(135deg, #7dd3a4 0%, #a8e6cf 100%)',
          border: '3px solid #2e6b4f',
          boxShadow: '0 4px 0 0 #2e6b4f',
          borderRadius: 22,
          padding: '12px 16px',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Back to home"
          className="inline-flex items-center gap-1.5"
          style={{
            background: '#fff',
            border: '2.5px solid #2e6b4f',
            borderRadius: 999,
            padding: '6px 14px 6px 10px',
            color: '#2e6b4f',
            boxShadow: '0 2px 0 0 #2e6b4f',
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <ChevronLeft size={14} strokeWidth={3} />
          Home
        </button>
        <div
          className="font-display"
          style={{
            fontWeight: 700, fontSize: 13, color: '#fff',
            textShadow: '0 1.5px 0 #2e6b4f',
            letterSpacing: '0.08em',
          }}
        >
          MY MAP
        </div>
      </header>

      {/* Filter pills — coral when active, white otherwise */}
      <div className="anim-2 mb-3 grid grid-cols-2 gap-2 shrink-0">
        <button
          onClick={() => setMode('all')}
          aria-pressed={mode === 'all'}
          className={mode === 'all' ? 'btn-ink' : 'btn-ghost'}
          style={{
            borderRadius: 999, padding: '8px 12px', fontSize: 13,
          }}
        >
          All sightings
        </button>
        <button
          onClick={() => setMode('first')}
          aria-pressed={mode === 'first'}
          title="Heat by first-found location of each species"
          className={mode === 'first' ? 'btn-ink' : 'btn-ghost'}
          style={{
            borderRadius: 999, padding: '8px 12px', fontSize: 13,
          }}
        >
          First sightings
        </button>
      </div>

      {/* Map card — flex-1 to consume remaining vertical space so the page
          fits the viewport without scrolling. Cream gradient background to
          match the Birdfolk paper look — states sit on this lightly tinted
          background like a watercolor wash. */}
      <div
        className="anim-4 overflow-hidden relative flex-1 min-h-0 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #f0fafb 0%, #fffaeb 100%)',
          border: '3px solid #2a3445',
          boxShadow: '0 4px 0 0 #2a3445',
          borderRadius: 22,
        }}
      >

        {/* map body — flex-1 itself so the SVG fills whatever space is left
            inside the card after the counter and share footer are accounted
            for. */}
        <div className="relative flex-1 min-h-0 overflow-hidden p-4 sm:p-5 flex flex-col">
          {/* Counter — centered & oversized, mirroring the home-page hero
              count. Scope label + optional "← USA" pill sit above the big
              number; locations + "tap to zoom" hint sit below. */}
          <div className="shrink-0 mb-3 text-center">
            <div className="font-mono text-[9px] sm:text-[10px] ink-faint tracking-[0.25em] uppercase mb-2 flex items-center justify-center gap-2 flex-wrap">
              <span>Native species</span>
              <span className="ink-faint">·</span>
              <span className="rust" style={{ fontWeight: 600 }}>{activeName}</span>
              {region && (
                <button
                  onClick={() => setRegion(null)}
                  className="btn-ghost rounded-full px-2 py-0.5 inline-flex items-center gap-1 ml-1"
                  style={{ fontSize: '8.5px', letterSpacing: '0.15em' }}
                  aria-label="Zoom out to USA"
                >
                  <ChevronLeft size={10} strokeWidth={2.25} />
                  USA
                </button>
              )}
            </div>
            <div className="flex items-baseline justify-center gap-2 flex-wrap">
              <div
                className="font-display ink leading-none"
                style={{ fontWeight: 800, fontSize: 'clamp(2.75rem, 10vw, 4.25rem)', letterSpacing: '-0.02em' }}
              >
                {region ? (effectiveRegionNativeCount[region] ?? 0) : (userCount ?? 0)}
              </div>
              <div
                className="font-display ink-faint leading-none"
                style={{ fontWeight: 500, fontSize: 'clamp(1rem, 3.5vw, 1.5rem)' }}
              >
                / {TOTAL}
              </div>
            </div>
            <p className="ink-soft text-[11px] sm:text-xs mt-2">
              {mode === 'first' ? (
                <>
                  {totalLocations > 0 ? (
                    <>
                      <span className="rust font-mono" style={{ fontWeight: 600 }}>{totalLocations.toLocaleString()}</span> first-found
                      location{totalLocations === 1 ? '' : 's'}
                    </>
                  ) : 'no first-found locations in scope'}
                  {!region && ' · tap a region to zoom in'}
                </>
              ) : (
                <>
                  {totalLocations > 0 ? (
                    <>
                      <span className="rust font-mono" style={{ fontWeight: 600 }}>{totalLocations.toLocaleString()}</span> location{totalLocations === 1 ? '' : 's'}
                      {peakDiversity > 0 && (
                        <>
                          {' · peak '}
                          <span className="font-mono ink" style={{ fontWeight: 600 }}>{peakDiversity}</span> at one spot
                        </>
                      )}
                    </>
                  ) : 'no locations in scope'}
                  {!region && ' · tap a region to zoom in'}
                </>
              )}
            </p>
          </div>

          {/* SVG wrapper — always rendered so that even a region with no
              sightings still shows its outline + states. Only the contour
              heat layer is conditional on having projected points. A small
              centered hint floats over the map area when empty. */}
          <div className="relative flex-1 min-h-0 flex flex-col w-full" ref={svgContainerRef}>
            <div className="flex-1 min-h-0 flex items-center justify-center relative">
              <svg
                viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
                xmlns="http://www.w3.org/2000/svg"
                className="max-w-full max-h-full"
                preserveAspectRatio="xMidYMid meet"
                style={{ background: 'transparent', width: '100%', height: '100%' }}
              >
                <defs>
                  {/* A *dilated* clip for the heatmap. With a strict clipPath
                      tied to the literal outline, coastal hotspots get their
                      gaussian blobs sliced off at the coastline — and thin
                      barrier-island spots like the Outer Banks barely render
                      at all because the blob is mostly out over water. Using a
                      mask with a stroked + filled path lets the heat bleed
                      roughly 15 user-units past the coast. The mask outline is
                      `activeOutline` so it tracks the current zoom scope —
                      USA when full, region polygon when zoomed. */}
                  <mask id="us-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={viewBoxW} height={viewBoxH}>
                    <rect x={0} y={0} width={viewBoxW} height={viewBoxH} fill="black" />
                    <path
                      d={activePath(activeOutline) || ''}
                      fill="white"
                      stroke="white"
                      strokeWidth={30}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </mask>
                </defs>

                {/* State fills. When zoomed to a region, states outside the
                    region get a much fainter fill so the region reads as the
                    focal area but neighbors remain as visual context.
                    On the full US view, every state is clickable to zoom
                    into its region. */}
                <g>
                  {STATES.features.map((s) => {
                    const abbr = FIPS_TO_ABBR[s.id];
                    const rid = STATE_TO_REGION[abbr];
                    const inActive = !region || rid === region;
                    const clickable = !region && !!rid;
                    return (
                      <path
                        key={s.id}
                        d={activePath(s) || ''}
                        // Pale mint wash for active states, even paler for
                        // inactive (out-of-region) so the active region pops
                        fill={inActive ? '#c8e6c8' : 'rgba(200,230,200,0.30)'}
                        stroke="none"
                        onClick={clickable ? () => setRegion(rid) : undefined}
                        style={{ cursor: clickable ? 'pointer' : 'default' }}
                      />
                    );
                  })}
                </g>

                {/* Heatmap contours, masked to a *dilated* outline so coastal
                    and barrier-island hotspots remain visible. */}
                <g mask="url(#us-mask)">
                  {contours.map((c, i) => (
                    <path
                      key={i}
                      d={PIXEL_PATH(c) || ''}
                      fill={heatColor(maxValue > 0 ? c.value / maxValue : 0)}
                      stroke="none"
                    />
                  ))}
                </g>

                {/* Internal state borders — soft mint */}
                <path
                  d={activePath(STATE_BORDERS) || ''}
                  fill="none"
                  stroke="#7ab87a"
                  strokeWidth={0.7}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />

                {/* Region division borders — only on the full US view. Coral
                    dashed so they read as distinct tap-target dividers. */}
                {!region && (
                  <path
                    d={activePath(REGION_BORDERS) || ''}
                    fill="none"
                    stroke="#ff9a76"
                    strokeWidth={1.4}
                    strokeDasharray="4,2"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                )}

                {/* Outer border for the active scope — dark mint. */}
                <path
                  d={activePath(activeOutline) || ''}
                  fill="none"
                  stroke="#2e6b4f"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              </svg>
              </div>

              {/* Continuous gradient legend */}
              <div className="mt-2 flex items-center justify-center gap-3 flex-wrap shrink-0">
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
                  <rect x="0" y="0" width="160" height="12" fill="url(#legend-grad)" stroke="rgba(42,52,69,0.4)" strokeWidth="0.8" rx="6" />
                </svg>
                <span className="font-mono text-[10px] ink-faint tracking-widest uppercase">Many species</span>
              </div>

              {/* Empty-state overlay — sits on top of the rendered map when
                  there are no sightings to draw contours from. Lets the
                  user still see the region's geography so the zoom is
                  obviously working. */}
              {projectedCount === 0 && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center ink-faint text-xs sm:text-sm pointer-events-none">
                  {mode === 'first' && !firstAvailable ? (
                    <span className="inline-block bg-[#0c1f1f]/80 px-3 py-2 rounded-lg" style={{ pointerEvents: 'auto' }}>
                      First-sightings data isn't in storage yet — re-upload your
                      <span className="font-mono"> MyEBirdData.csv </span>
                      from Settings to enable this view.
                    </span>
                  ) : (
                    <span className="inline-block bg-[#0c1f1f]/80 px-3 py-1.5 rounded-lg">
                      no sightings {region ? 'in this region' : 'mapped yet'}
                    </span>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* footer */}
        <div className="relative px-4 sm:px-6 py-3 border-t rule flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase hidden sm:inline">
            {projectedCount.toLocaleString()} of {points.length.toLocaleString()} locations mapped
            {projectedCount < points.length && ' (others outside lower 48 / AK / HI)'}
          </span>
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase sm:hidden">
            {projectedCount.toLocaleString()} / {points.length.toLocaleString()} loc.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={shareCard}
              disabled={sharing || projectedCount === 0}
              className="btn-ink rounded-full px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
              aria-label="Share heatmap image"
            >
              {sharing ? <RefreshCw size={12} className="animate-spin" /> : <Share2 size={12} />}
              {sharing ? 'Building…' : 'Share'}
            </button>
          </div>
        </div>
        {shareError && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs" style={{
            background: 'rgba(127, 29, 29, 0.95)',
            color: '#f5f5f4',
            border: '1px solid rgba(248, 113, 113, 0.30)',
          }}>
            {shareError}
          </div>
        )}
      </div>

      {/* Page-level attribution footer — same on dashboard and map page. */}
      <footer className="mt-4 pt-3 border-t rule text-center anim-5 shrink-0">
        <p className="font-mono text-[9px] ink-faint tracking-[0.25em] uppercase leading-relaxed">
          Sightings · ebird (Cornell Lab of Ornithology)<br />
          Total · ABA Checklist v8.0.7
        </p>
      </footer>
    </div>
  );
}
