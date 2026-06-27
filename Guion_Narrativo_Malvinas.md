# Proyecto Narrativo Transmedia: Malvinas en Primera Persona
## Guión Narrativo Completo y Estructura del Juego Serio

Este documento contiene todas las escenas, opciones, bifurcaciones de decisiones e hitos del juego interactivo "Malvinas en primera persona", desarrollado como recurso didáctico para la materia **Fundamentos de la Computación**.

---

### Escena: intro (Otoño 1982 · Buenos Aires)
- **Capítulo:** Prólogo
- **Día:** 0

#### Texto Narrativo:
Tenés 18 años. Acabás de empezar el Servicio Militar Obligatorio en Campo de Mayo y tu mundo no es más grande que las calles de tu barrio. Una mañana de abril, de forma abrupta, anuncian por altavoz: "Hoy todos los conscriptos forman para una misión especial". Te entregan un casco verde demasiado pesado, un fusil FAL viejo con la correa gastada, y un boleto de avión hacia un sur helado que apenas conocés de los mapas escolares.

El sargento te grita el apellido rompiendo el silencio. Hay nervios palpables pero también un orgullo confuso flotando en el aire. Algunos compañeros se ríen para no dejar escapar el llanto. Tu cuerpo, tenso y congelado, todavía no termina de entender hacia qué abismo te están empujando.

#### Decisiones:
1. "Subo al avión sin preguntar. Cumplo mi deber." → Salta a `casa_familia` *(Efectos: {'miedo': '+1', 'conviccion': '+2'})*
2. "Le pregunto al sargento a dónde vamos exactamente." → Salta a `pregunta_sgto` *(Efectos: {'miedo': '0', 'conviccion': '+1', 'info': '+2'})*
3. "Intento avisarle a mi mamá antes de partir." → Salta a `casa_familia` *(Efectos: {'miedo': '+2', 'empatia': '+1', 'conviccion': '-1'})*

---

### Escena: casa_familia (La cena que no fue)
- **Capítulo:** 0
- **Día:** 0

#### Texto Narrativo:
Esa noche, mientras esperás el llamado a la formación final, te acordás de la última cena del domingo. Mamá había hecho milanesas con puré. Tu hermana chica te contaba un chiste de la escuela y vos no te reíste porque ya estabas pensando en el cuartel.

Ahora, sentado en el catre, con la mochila a tus pies, te das cuenta: no le diste el beso de despedida. No te despediste de tu perro. No le respondiste el último mensaje a tu novia.

Mañana muy temprano partís en avión.

#### Decisiones:
1. "Escribo una carta breve y le pido al cabo que la envíe." → Salta a `avion` *(Efectos: {'empatia': '+3', 'salud': '+1'})*
2. "Cierro los ojos. Pienso en mamá calentándome la leche." → Salta a `avion` *(Efectos: {'empatia': '+2', 'miedo': '+1'})*
3. "Me prometo volver vivo para terminar lo que dejé sin terminar." → Salta a `avion` *(Efectos: {'conviccion': '+3', 'salud': '+1'})*

---

### Escena: pregunta_sgto (En el cuartel)
- **Capítulo:** 1
- **Día:** 0

> **Contexto Histórico:**
> La ocupación británica data del 3 de enero de 1833. La decisión militar de 1982 fue tomada por la Junta Dictatorial liderada por Galtieri sin consultar al pueblo, en parte para canalizar el descontento social por la crisis económica y los crímenes del régimen.

#### Texto Narrativo:
"Vamos a recuperar nuestras Malvinas, soldado. Los ingleses las ocupan desde hace 149 años y las vamos a recuperar." El sargento te mira fijo y severo. "¿Alguna duda?"

Un par de compañeros tuyos asienten con orgullo. Otros tragan saliva. Vos pensás en el mapa que te mostró el profesor de Geografía en quinto año: dos islas grises en una esquina del Atlántico, lejos de todo.

#### Decisiones:
1. "Saludo firme y avanzo hacia la formación." → Salta a `casa_familia` *(Efectos: {'conviccion': '+2', 'info': '+1'})*
2. "Me quedo callado, mirando al suelo." → Salta a `casa_familia` *(Efectos: {'miedo': '+1', 'info': '+1'})*

---

### Escena: avion (Vuelo al sur)
- **Capítulo:** 1
- **Día:** 1

#### Texto Narrativo:
El Hércules está repleto, sofocante y ensordecedor. Sus gigantescas turbinas hacen vibrar cada centímetro de chapa del fuselaje, metiéndose en los huesos. Los muchachos, tratando de espantar el silencio, cantan la Marcha de Malvinas a todo pulmón; algunos ya van por la quinta vez. Hay risas nerviosas, bromas pesadas para disimular la ansiedad, y un suboficial en el rincón que reza apretando un rosario.

Mirás por la pequeña ventanilla circular y descubrís, a través de un denso colchón de nubes blancas, la inmensidad del Atlántico Sur: oscuro, profundo e infinito. Algunos en este avión jamás habían salido de los límites de su provincia. Muchos jamás habían visto la nieve o sentido verdadero frío. Demasiados no van a tener la oportunidad de volver.

Un cabo te reparte de prisa una hoja de papel en blanco. "Si querés escribirle unas últimas líneas a tu vieja, hacelo ahora. Allá, en el barro, después no se va a poder".

#### Decisiones:
1. "Escribo: "No te preocupes mami, vuelvo pronto."" → Salta a `islas` *(Efectos: {'empatia': '+2'})*
2. "Escribo todo lo que siento: el miedo, la nieve, la lejanía." → Salta a `islas` *(Efectos: {'empatia': '+3', 'miedo': '+2'})*
3. "Guardo la hoja en blanco en el bolsillo interno." → Salta a `islas` *(Efectos: {'miedo': '+1'})*

---

### Escena: islas (Puerto Argentino)
- **Capítulo:** 2
- **Día:** 2

> **Contexto Histórico:**
> El suelo malvinense es turbera: retiene el agua y al cavar trincheras ("pozos de zorro"), el agua subterránea inundaba el foso. Los soldados vivían empapados a temperaturas bajo cero, lo que provocó miles de casos de pie de trinchera y congelamientos.

#### Texto Narrativo:
Al bajar la rampa del avión, el viento te corta la cara como si te hubieran tirado un balde de cuchillos. Hace 2°C. Llovizna helada y horizontal. Todo huele a turba húmeda y a combustible JP-1 derramado.

Tu sección es asignada a defender el Monte Tumbledown, un cerro pelado al oeste de Puerto Argentino. La orden es clara y categórica: hay que cavar pozos de zorro en la piedra. Los ingleses van a venir desde el mar; hay que esperarlos.

Un cabo veterano te muestra el suelo: "Pico, pala, paciencia. Y cuidado con el agua subterránea."

#### Decisiones:
1. "Pico la piedra rápido para armar una buena defensa." → Salta a `guardia_nocturna` *(Efectos: {'conviccion': '+2', 'hambre': '+1'})*
2. "Ayudo primero a los compañeros que no tienen palas." → Salta a `guardia_nocturna` *(Efectos: {'empatia': '+3', 'conviccion': '+1', 'hambre': '+1'})*
3. "Cavo despacio, tratando de conservar la poca energía." → Salta a `guardia_nocturna` *(Efectos: {'miedo': '+1', 'frio': '+2'})*

---

### Escena: guardia_nocturna (Primera Guardia)
- **Capítulo:** 3
- **Día:** 3

#### Texto Narrativo:
2 AM. Tu turno de vigilancia. Estás solo en la intemperie. La humedad se cuela por los puños del capote y se mete en los huesos. La campera militar de mala calidad parece de papel mojado.

A lo lejos escuchás el cañoneo naval británico contra la pista del aeropuerto. Cada estallido te hace temblar el suelo bajo las botas. Mirás las estrellas: en Buenos Aires nunca se veían tantas. Acá sí. Acá brillan como si fueran clavos en el techo del mundo.

Intentás recordar el olor del café con leche de tu casa pero no lo lográs. El frío borra los olores antes que los recuerdos.

#### Decisiones:
1. "Abrazo mi fusil para tratar de no temblar." → Salta a `amigo` *(Efectos: {'frio': '+2', 'miedo': '+2'})*
2. "Me pongo a pensar en la cocina caliente de mi casa." → Salta a `amigo` *(Efectos: {'empatia': '+1', 'frio': '+2', 'hambre': '+1'})*
3. "Intento mantener la visión enfocada en el horizonte." → Salta a `amigo` *(Efectos: {'conviccion': '+1', 'frio': '+1'})*

---

### Escena: amigo (Ramón)
- **Capítulo:** 4
- **Día:** 4

> **Contexto Histórico:**
> Para contrarrestar la censura del gobierno dictatorial argentino que insistía con "Estamos ganando", muchos soldados sintonizaban radios uruguayas (Radio Carve de Montevideo era muy escuchada) o la propia BBC para entender la realidad del terreno.

#### Texto Narrativo:
Al día siguiente descubrís que tu compañero de pozo es Ramón Antúnez, de un pueblo cerca de Goya, Corrientes. Tiene 19 años, una hermana enferma y una novia llamada Alicia que le tejió tres pulóveres de lana gruesa. "Pero no me dejaron traer ni uno", te cuenta riéndose para no llorar.

A la noche, Ramón saca un transistor a pilas que escondió en la mochila bajo unas medias. Sintoniza onda corta. La señal viene y va con el viento. Una voz seca dice algo en inglés. Después llega un acento uruguayo: "Versión británica indica que el avance hacia Puerto Argentino es sostenido."

#### Decisiones:
1. "Sintonizo radio de Argentina. Necesito buenas noticias." → Salta a `oficial_humano` *(Efectos: {'conviccion': '+2', 'info': '-2'})*
2. "Sintonizo una radio de afuera (BBC/Uruguay)." → Salta a `oficial_humano` *(Efectos: {'conviccion': '-1', 'info': '+3', 'miedo': '+1'})*
3. "Apago la radio. No me importa lo que digan allá lejos." → Salta a `oficial_humano` *(Efectos: {'empatia': '+1'})*

---

### Escena: oficial_humano (El Subteniente Mendoza)
- **Capítulo:** 4
- **Día:** 5

> **Contexto Histórico:**
> Hubo oficiales y suboficiales argentinos que se comportaron con dignidad y empatía hacia la tropa, contrastando con los casos documentados de maltrato. Muchos cayeron en combate junto a sus conscriptos. La memoria de Malvinas también es la de ellos.

#### Texto Narrativo:
Al amanecer aparece en el pozo el Subteniente Carlos Mendoza, un cordobés de 24 años recién egresado del Colegio Militar. No es como los otros oficiales. Lleva la misma cara de cansancio que vos.

"Pibes" -- les dice -- "vengo de la cocina del Estado Mayor. Me afané dos latas." Las pone sobre el barro: corned beef y duraznos en almíbar. "Compártanlas. Y si alguien pregunta, no me vieron."

Antes de irse te aprieta el hombro y te dice: "Vos sos de Buenos Aires, ¿no? Tengo una novia ahí. Si no vuelvo, contale que la pensé hasta el final."

#### Decisiones:
1. "Le prometo que voy a buscar a su novia si vuelvo." → Salta a `hambre` *(Efectos: {'empatia': '+4', 'conviccion': '+1'})*
2. "Le doy las gracias. Compartimos las latas con todo el pozo." → Salta a `hambre` *(Efectos: {'empatia': '+3', 'hambre': '-2'})*
3. "Me como mi parte y guardo el resto para Ramón." → Salta a `hambre` *(Efectos: {'empatia': '+2', 'hambre': '-1'})*

---

### Escena: hambre (La logística rota)
- **Capítulo:** 5
- **Día:** 14

> **Contexto Histórico:**
> El desabastecimiento fue dramático. Las diferencias de provisiones entre oficiales de alto rango y suboficiales/conscriptos crearon graves tensiones. La desnutrición aguda fue diagnosticada en cientos de soldados al volver al continente.

#### Texto Narrativo:
Pasaron 9 días desde la última ración caliente. La "ración de combate" -- un mate cocido fingido y un caldo de oveja aguado -- llega tarde y fría, si es que llega. La artillería enemiga cortó casi todos los suministros desde San Carlos.

Un grupo del pozo de al lado planea una incursión nocturna a Puerto Argentino para robar comida del depósito reservado a los oficiales. "Allá hay corned beef, fideos, dulce de leche, vino", susurra uno con los ojos brillantes. "Está todo, pibe. Está todo."

#### Decisiones:
1. "Me uno al grupo. La necesidad es más fuerte." → Salta a `castigo` *(Efectos: {'hambre': '-2', 'miedo': '+2'})*
2. "Decido aguantar. Es peligroso si nos descubren." → Salta a `ataque_aereo_previo` *(Efectos: {'hambre': '+3', 'conviccion': '+1'})*
3. "Le doy lo último que me queda a Ramón, que está peor." → Salta a `ataque_aereo_previo` *(Efectos: {'empatia': '+4', 'hambre': '+4', 'salud': '-1'})*

---

### Escena: castigo (Descubiertos)
- **Capítulo:** 5
- **Día:** 16

> **Contexto Histórico:**
> Los estaqueamientos están documentados como tortura grave por veteranos sobrevivientes y constituyen causas judiciales abiertas. En 2023 la Cámara Federal de Comodoro Rivadavia los calificó formalmente como "delitos de lesa humanidad".

#### Texto Narrativo:
Madrugada. La incursión sale mal. Un cabo los sorprende a la vuelta y les arranca las latas de las manos. A uno de los pibes -- Sosa, de Tucumán, 18 años -- el cabo lo manda al "estaqueamiento": cuatro estacas en la tierra helada, las muñecas y los tobillos atados, la cara contra el barro mojado.

Lo dejan tres horas. Cuando lo desatan no se puede parar. Tiene los dedos azules y las venas explotadas en las piernas. Pasarán semanas hasta que la denuncia llegue a Buenos Aires.

#### Decisiones:
1. "Trato de cubrir a Sosa durante la noche con mi capote." → Salta a `ataque_aereo_previo` *(Efectos: {'empatia': '+3', 'miedo': '+1', 'frio': '+2'})*
2. "Trago saliva y guardo mi frustración para sobrevivir." → Salta a `ataque_aereo_previo` *(Efectos: {'miedo': '+2', 'info': '+2'})*

---

### Escena: ataque_aereo_previo (Fuego naval)
- **Capítulo:** 6
- **Día:** 50

#### Texto Narrativo:
Mayo avanza. Los británicos desembarcan en San Carlos el 21. Avanzan lento pero seguros. Las noches se vuelven una pesadilla de hierro: barcos británicos disparan andanadas de cañón naval sobre las posiciones argentinas para quebrar la moral y no dejarlos dormir.

Los proyectiles silban sobre el techo de la trinchera. Cada uno suena como un tren cayendo del cielo. Algunos explotan a metros, otros a kilómetros. Nunca sabés cuál te va a tocar.

Ramón te aprieta el brazo. No habla. Tiene los ojos cerrados y la boca apretada. Vos sentís el corazón en las orejas.

#### Decisiones:
1. "Tapo mis oídos y rezo." → Salta a `paramedico` *(Efectos: {'miedo': '+3'})*
2. "Me asomo para intentar ver de dónde disparan." → Salta a `paramedico` *(Efectos: {'conviccion': '+2', 'miedo': '+1'})*
3. "Acuno a Ramón, que entró en pánico." → Salta a `paramedico` *(Efectos: {'empatia': '+3'})*

---

### Escena: paramedico (Sangre joven)
- **Capítulo:** 6
- **Día:** 52

> **Contexto Histórico:**
> Los paramédicos y enfermeros argentinos en Malvinas trabajaron con suministros mínimos en hospitales de campaña improvisados. Salvaron cientos de vidas con coraje y muchos cayeron junto a quienes intentaban salvar.

#### Texto Narrativo:
Antes del amanecer, una explosión muy cercana. Salen cuatro pibes corriendo del pozo de al lado. Tres traen al cuarto desmayado, sangrando del muslo. Le tiraron una andanada arriba.

El paramédico -- un suboficial que en la vida civil era enfermero en Mar del Plata -- corta el pantalón con tijera y aprieta. "Pinza, pinza, pinza", grita. No hay morfina. Le dan whisky de una petaca.

El chico abre los ojos. Pregunta por su mamá. El paramédico dice que sí, que ya viene, mientras ata el torniquete con desesperación.

#### Decisiones:
1. "Le tomo la mano al chico mientras lo trasladan." → Salta a `hospital_campana` *(Efectos: {'empatia': '+3', 'miedo': '+1'})*
2. "Ayudo al paramédico cargando vendajes." → Salta a `hospital_campana` *(Efectos: {'empatia': '+2', 'info': '+1'})*
3. "Vuelvo a mi pozo. No puedo soportar la imagen." → Salta a `hospital_campana` *(Efectos: {'miedo': '+3', 'salud': '-1'})*

---

### Escena: hospital_campana (Congelamiento)
- **Capítulo:** 7
- **Día:** 60

> **Contexto Histórico:**
> El "Pie de trinchera" se causaba por la humedad permanente, la inmovilidad y el congelamiento. Generó múltiples amputaciones que hubieran sido evitables con el abrigo que las familias enviaban al continente -- pero las donaciones llamadas "Operación Lana" jamás llegaron en su mayoría a las islas.

#### Texto Narrativo:
Amanece y al sacarte las botas no sentís los dedos del pie izquierdo. Cuando los ves, están negros. Negros como los de un cadáver. El sargento te ordena ir caminando hasta el hospital de campaña en Puerto Argentino. Cuatro kilómetros que se sienten cuarenta.

Adentro hay decenas de pibes como vos. Algunos sin un dedo, otros sin un pie. Una enfermera de Catamarca te lava con agua tibia. Te dice algo en voz baja para que no la escuche el médico: "Mové los dedos así, así. Quizás todavía los podés salvar."

Mirás el techo de lona y entendés: esto que vivís no se lo van a creer en tu casa.

#### Decisiones:
1. "Pido volver a mi pozo. Está Ramón ahí y viene el ataque final." → Salta a `medios` *(Efectos: {'conviccion': '+3', 'empatia': '+2', 'frio': '-1'})*
2. "Dejo que los médicos me atiendan y descanso un poco." → Salta a `medios` *(Efectos: {'frio': '-3', 'hambre': '-1', 'salud': '+2'})*

---

### Escena: medios (Revistas del continente)
- **Capítulo:** 8
- **Día:** 65

#### Texto Narrativo:
En la sala de espera del hospital ves una pila de revistas "Gente" llegada en un Hércules de logística. La tapa muestra a una madre sonriente con la foto de su hijo conscripto. El título grita en mayúsculas: "ESTAMOS GANANDO".

Adentro hay listas de donaciones millonarias: golosinas, abrigos, cigarrillos, chocolates. Toneladas. Vos no comiste un chocolate en treinta días.

Un compañero, sentado al lado tuyo, abre la revista. Lee los nombres. Después la cierra y mira al vacío. "Mi vieja debe estar leyendo esto ahora mismo en el living", dice.

#### Decisiones:
1. "Lloro de impotencia. Alguien nos mintió todo este tiempo." → Salta a `final_ataque` *(Efectos: {'info': '+3', 'miedo': '+1'})*
2. "Tiro la revista. Acá la única verdad es el plomo que viene." → Salta a `final_ataque` *(Efectos: {'conviccion': '+1', 'empatia': '-1'})*
3. "Guardo una página para mostrarle a mi familia cuando vuelva." → Salta a `final_ataque` *(Efectos: {'info': '+2', 'conviccion': '+2'})*

---

### Escena: final_ataque (La Batalla Final)
- **Capítulo:** 9
- **Día:** 73

> **Contexto Histórico:**
> Los enfrentamientos cuerpo a cuerpo en los cerros perimetrales fueron de altísima intensidad. Algunos grupos resistieron hasta agotar municiones contra tropas de élite paracaidistas británicas que avanzaban en la noche con visión nocturna. Por la madrugada del 14 quedó claro que la posición era insostenible.

#### Texto Narrativo:
Noche del 13 al 14 de junio de 1982. Monte Longdon, Dos Hermanas y Tumbledown caen uno tras otro. Todo es fuego intenso, bengalas británicas que iluminan los cerros como si fuera mediodía blanco, gritos en dos idiomas, disparos que pasan zumbando.

Vos y Ramón están atrincherados con el último cargador. A 200 metros se escucha la respiración del enemigo entre las piedras. Un compañero al lado tuyo grita "¡Viva la Patria!". Otro reza. Otro llora. Otro hace todas esas cosas a la vez.

La orden por radio es clara: aguantar hasta el último cartucho. Nadie te dice qué hacer después.

#### Decisiones:
1. "Soporto la posición y devuelvo el fuego hasta el final." → Salta a `rendicion` *(Efectos: {'conviccion': '+4', 'miedo': '+3'})*
2. "Trato de replegar al grupo a una posición segura." → Salta a `rendicion` *(Efectos: {'empatia': '+2', 'info': '+2'})*
3. "Todo es caos. Sigo a Ramón a ciegas, lo tomo del brazo." → Salta a `rendicion` *(Efectos: {'miedo': '+4', 'empatia': '+2'})*

---

### Escena: rendicion (La rendición)
- **Capítulo:** 10
- **Día:** 74

> **Contexto Histórico:**
> Saldo del conflicto: 649 caídos argentinos, 255 británicos y 3 isleños. Los conscriptos argentinos fueron capturados, registrados en el Boletín de Cautivos y devueltos al continente en barcos transatlánticos como el Canberra y vuelos comerciales fletados.

#### Texto Narrativo:
Humo blanco sobre Puerto Argentino. La orden es romper las armas y rendirse. Vos rompés el cerrojo de tu fusil contra una roca. El golpe seco te suena como el cierre de un libro.

El General Menéndez firma la capitulación a las 23:30 horas. Caminás hacia el galpón gris donde te van a registrar como prisionero de guerra. Hay miles. Pibes mojados, sucios, hambrientos, callados. Un teniente inglés joven, casi de tu edad, te ofrece un cigarrillo. Lo aceptás.

Terminó. 74 días que cambiaron para siempre quién eras.

#### Decisiones:
1. "Cierro los ojos, respiro la paz de estar vivo." → Salta a `prisionero` *(Efectos: {'empatia': '+1', 'salud': '+1'})*
2. "Siento vergüenza de haber perdido." → Salta a `prisionero` *(Efectos: {'conviccion': '-2', 'miedo': '+1'})*
3. "Juro que nadie los va a olvidar." → Salta a `prisionero` *(Efectos: {'info': '+3', 'conviccion': '+2'})*

---

### Escena: prisionero (Prisionero de guerra)
- **Capítulo:** 10
- **Día:** 75

#### Texto Narrativo:
Te alojan en el galpón de un frigorífico abandonado. Hay alambre de púas y guardias. Pero también -- para tu sorpresa -- hay galletas inglesas con manteca, té caliente, primeros vendajes que no viste en 60 días. Un médico militar inglés te examina los pies y dice algo en su idioma; otro traduce: "Por suerte vas a conservarlos".

A tu lado, Ramón duerme por primera vez en semanas. Tres horas seguidas. Cuando se despierta, te pregunta si esto es el cielo. "No, Ramón. Es el principio de la vuelta."

Dos días después los embarcan en el Canberra rumbo a Puerto Madryn.

#### Decisiones:
1. "Le pido a Ramón que me prometa volver a vernos en libertad." → Salta a `regreso` *(Efectos: {'empatia': '+3'})*
2. "Hablo con el médico inglés en mi inglés básico de la escuela." → Salta a `regreso` *(Efectos: {'info': '+2', 'salud': '+1'})*
3. "Me quedo callado. Ya no me salen palabras." → Salta a `regreso` *(Efectos: {'miedo': '+2', 'salud': '-1'})*

---

### Escena: regreso (La vuelta del silencio)
- **Capítulo:** Epílogo
- **Día:** 90

> **Contexto Histórico:**
> Más de 500 veteranos argentinos se suicidaron en las décadas posteriores a 1982 por trastorno de estrés post-traumático, falta de reconocimiento social, abandono del Estado e incapacidad para reinsertarse. Hubo que esperar hasta 2007 para que la Pensión Vitalicia para Veteranos de Guerra fuera reformada significativamente.

#### Texto Narrativo:
Desembarcan en Puerto Madryn una madrugada, a escondidas. El gobierno teme que los argentinos vean en sus propios ojos lo que pasó. No hay banderas, no hay diarios, no hay aplausos. Hay micros sin parar y rutas vacías hasta Bahía Blanca.

En casa, tu mamá dejó tu cama tendida intacta los 74 días. Pero esa misma semana, los vecinos cruzan a la otra vereda cuando te ven. La frase "héroe de Malvinas" tarda 25 años en pronunciarse en voz alta.

Los primeros años son los del olvido oficial: la "desmalvinización". Te ofrecen un trabajo en una panadería; el dueño te dice "que lo de Malvinas no se diga acá, ¿no?". Te quedan los amigos del CECIM y las cartas de Ramón desde Corrientes.

#### Decisiones:
1. "Me sumo al CECIM. Acompañar a otros me devuelve algo." → Salta a `reencuentro` *(Efectos: {'empatia': '+3', 'info': '+2'})*
2. "Me encierro. No quiero hablar con nadie del tema." → Salta a `reencuentro` *(Efectos: {'miedo': '+2', 'salud': '-2'})*
3. "Estudio. Quiero entender por qué pasó lo que pasó." → Salta a `reencuentro` *(Efectos: {'info': '+4', 'conviccion': '+1'})*

---

### Escena: reencuentro (10 años después)
- **Capítulo:** Epílogo II
- **Día:** null

> **Contexto Histórico:**
> El CECIM (Centro de Excombatientes de las Islas Malvinas) y otras organizaciones de veteranos sostuvieron durante décadas el reclamo por reconocimiento, salud, educación y pensiones. Su trabajo militante y el aporte del Equipo Argentino de Antropología Forense permitieron, a partir de 2017, identificar a casi 120 caídos del Cementerio de Darwin.

#### Texto Narrativo:
Año 1992. La inmensa plaza San Martín de Buenos Aires está iluminada débilmente por cientos de velitas que parpadean contra el viento. Es el décimo aniversario. Ramón viajó desde su pueblo en Corrientes en un colectivo destartalado de 18 horas de viaje solo para verte. Te abraza fuerte, con esa fuerza bruta que solo se aprende en la guerra. Te presenta a su hija pequeña: la llamó Malvina, y la sostiene orgulloso en brazos.

"Pibe...", te murmura apretando su frente contra la tuya, con los ojos vidriosos. "Volveríamos a ese frío maldito mil veces... si fuera para abrazarnos de nuevo".

En la plaza brillan exactamente 649 velitas silenciosas. Una por cada compañero que se quedó haciendo guardia eterna en el sur. La velita de Sosa, el chico de Tucumán, está justo en el centro. La encendiste vos con las manos temblando. Ramón te aprieta el hombro. Una llovizna fina y fría comienza a caer sobre la ciudad, pero nadie en la plaza se mueve un solo centímetro.

#### Decisiones:
1. "Descubrir cómo el viaje me ha marcado para siempre ->" → Salta a `final`

---

### Escena: mama (Sin opción)
- **Capítulo:** 1
- **Día:** 0

#### Texto Narrativo:
No hay teléfono fijo libre y hay orden estricta de no difundir movimientos de tropas. La fila al único teléfono público es de cien personas. Tu mamá no se entera hasta tres días después cuando lo dicen por cadena nacional.

#### Decisiones:
1. "Subir al avión con angustia contenida." → Salta a `avion` *(Efectos: {'miedo': '+1', 'salud': '-1'})*

---

