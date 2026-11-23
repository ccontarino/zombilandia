# Zombilandia

Platformer de zombies para el navegador, hecho con canvas y sin librerías. Personajes y arte propios.

- **Jugar:** https://ccontarino.github.io/zombilandia/
- **Controles:** ← → o A D para moverte, Espacio o ↑ para saltar (en el aire, de nuevo: doble salto), X, F o Shift para el rayo láser de ojos. En el celu, botones en pantalla.
- **Súper poder:** el rayo láser atraviesa a todos los zombis en línea y se frena en las paredes. Tiene recarga corta (barra ⚡).
- **Enemigos nuevos:** murciélagos zombis que bajan hacia vos, escupidores que tiran ácido en arco (el rayo deshace el ácido) y escuderos con un escudo que frena el rayo de frente: pisalos, pegales de espaldas o usá el modo bestia x2.
- **Niveles:**
  1. **El cementerio:** tumbas, pozos y zombis lentos.
  2. **Ciudad en ruinas:** saltos entre techos, resortes y zombis corredores que te persiguen.
  3. **Pantano tóxico:** charcos de líquido tóxico, troncos flotantes y zombis saltarines.
  4. **El laboratorio:** pinches, piletas de ácido, paredes que frenan el rayo y zombis grandotes de 3 golpes.
  5. **La guarida del Rey Zombi:** lava, castillo y el jefe final, que salta, hace temblar el piso e invoca zombis.
- **Jeringa (modo bestia):** en cada nivel hay un bloque `?` que suelta una jeringa. Al agarrarla el héroe se hace grande y musculoso hasta que lo golpean o pierde una vida (y lo conserva al pasar de nivel): corre más rápido, su rayo es dorado, más largo, recarga más rápido y pega el triple. Si te golpean, perdés el poder en vez de una vida.
- **Modo bestia x2:** si agarrás otra jeringa estando en modo bestia, el héroe se hace el doble de grande: corre todavía más rápido y el rayo es rosa, enorme, llega más lejos y pega x5. Cada golpe te baja un nivel (x2 → bestia → normal).
- **Escudo:** una burbuja que sale de un bloque `?` en cada nivel y aguanta un golpe. Se rompe antes de que pierdas el modo bestia o una vida.
- **Tienda:** entre nivel y nivel gastás los cerebros en vida extra (30), escudo (25), jeringa (50) o rayo largo para toda la partida (80).
- **Plataformas y agua:** plataformas que se mueven (grúas, ascensores, troncos, cadenas sobre la lava), plataformas rajadas que se derrumban cuando las pisás y vuelven a aparecer, y una laguna en el pantano donde se nada tocando saltar.
- **Progreso:** el juego recuerda hasta qué nivel llegaste; en la pantalla de inicio tocá ⚡ (o apretá el número del nivel) para seguir desde ahí.
- **Reglas:** saltale encima a los zombis para eliminarlos, juntá cerebros (son la moneda de la tienda), abrí los bloques `?` pegándoles desde abajo y llegá a la bandera.

Para probarlo en local: abrí `index.html` o corré `python3 -m http.server`.
