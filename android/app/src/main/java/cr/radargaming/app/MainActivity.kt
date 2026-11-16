package cr.radargaming.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.NumberFormat
import java.util.Locale

data class GameSummary(
    val id: Int,
    val title: String,
    val platforms: String,
    val bestPriceCrc: Double?,
    val bestStore: String?,
    val priceCount: Int,
    val rating: Double?,
    val discountPct: Double?
)

data class OfferDetail(
    val store: String,
    val priceCrc: Double,
    val regularPriceCrc: Double?,
    val url: String?,
    val format: String
)

data class GameFullDetail(
    val id: Int,
    val title: String,
    val platforms: String,
    val metacritic: Int?,
    val offers: List<OfferDetail>
)

private val BgCanvas = Color(0xFF090D16)
private val BgCard = Color(0xFF111827)
private val BorderSubtle = Color(0xFF1E293B)
private val EmeraldAccent = Color(0xFF10B981)
private val AmberScore = Color(0xFFF59E0B)

fun formatCrc(amount: Double?): String {
    if (amount == null) return "Sin precio"
    if (amount == 0.0) return "Gratis"
    val nf = NumberFormat.getIntegerInstance(Locale("es", "CR"))
    return "₡${nf.format(amount.toLong())}"
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 10.0.2.2 apunta al localhost de tu PC desde el emulador Android
        val baseUrl = "http://10.0.2.2:8000"

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = BgCanvas,
                    surface = BgCard,
                    primary = EmeraldAccent
                )
            ) {
                Surface(modifier = Modifier.fillMaxSize(), color = BgCanvas) {
                    VaquitasOfertasApp(baseUrl)
                }
            }
        }
    }
}

@Composable
fun VaquitasOfertasApp(baseUrl: String) {
    var query by remember { mutableStateOf("") }
    var games by remember { mutableStateOf<List<GameSummary>>(emptyList()) }
    var selectedGameId by remember { mutableStateOf<Int?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(query) {
        loading = true
        games = fetchGames(baseUrl, query)
        loading = false
    }

    if (selectedGameId != null) {
        GameDetailScreen(
            baseUrl = baseUrl,
            gameId = selectedGameId!!,
            onBack = { selectedGameId = null }
        )
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            // Cabecera de Marca
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(EmeraldAccent)
                ) {
                    Text("VO", color = BgCanvas, fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "Vaquitas Ofertas",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Comparador CR (₡) · Multi-tienda y Metacritic",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                singleLine = true,
                placeholder = { Text("Buscar juego en Vaquitas Ofertas...", color = Color(0xFF64748B)) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = EmeraldAccent)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(games) { game ->
                        GameCard(game = game, onClick = { selectedGameId = game.id })
                    }
                }
            }
        }
    }
}

@Composable
fun GameCard(game: GameSummary, onClick: () -> Unit) {
    val offerText = if (game.priceCount == 1) "1 oferta" else "${game.priceCount} ofertas"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(BgCard)
            .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = game.title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(8.dp))
            // Badge Metacritic
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF1E293B))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "MC ${game.rating?.toInt() ?: "—"}",
                    color = if ((game.rating ?: 0.0) >= 75.0) EmeraldAccent else AmberScore,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Mejor en ${game.bestStore ?: "N/D"}",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
                Text(
                    text = formatCrc(game.bestPriceCrc),
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if ((game.discountPct ?: 0.0) > 0) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(EmeraldAccent)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "-${game.discountPct!!.toInt()}%",
                            color = BgCanvas,
                            fontWeight = FontWeight.Black,
                            fontSize = 12.sp
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF0F2922))
                        .padding(horizontal = 9.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = offerText,
                        color = EmeraldAccent,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
fun GameDetailScreen(baseUrl: String, gameId: Int, onBack: () -> Unit) {
    val context = LocalContext.current
    var detail by remember { mutableStateOf<GameFullDetail?>(null) }

    LaunchedEffect(gameId) {
        detail = fetchGameDetail(baseUrl, gameId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        TextButton(onClick = onBack) {
            Text("← Volver a Vaquitas Ofertas", color = EmeraldAccent, fontWeight = FontWeight.SemiBold)
        }

        if (detail == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldAccent)
            }
        } else {
            val g = detail!!
            Text(
                text = g.title,
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "${g.offers.size} ofertas activas encontradas · Metacritic: ${g.metacritic ?: "N/A"}",
                color = EmeraldAccent,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(14.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(g.offers) { offer ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(BgCard)
                            .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(offer.store, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Text(offer.format, color = Color(0xFF94A3B8), fontSize = 12.sp)
                            Text(
                                formatCrc(offer.priceCrc),
                                color = EmeraldAccent,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 17.sp
                            )
                        }
                        if (!offer.url.isNullOrBlank()) {
                            Button(
                                onClick = {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(offer.url)))
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldAccent)
                            ) {
                                Text("Abrir", color = BgCanvas, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

suspend fun fetchGames(baseUrl: String, q: String): List<GameSummary> = withContext(Dispatchers.IO) {
    try {
        val encoded = java.net.URLEncoder.encode(q, "UTF-8")
        val url = URL("$baseUrl/games?page=1&page_size=50&sort=discount&q=$encoded")
        val conn = url.openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        val body = conn.inputStream.bufferedReader().readText()
        val json = JSONObject(body)
        val arr = json.getJSONArray("items")
        val list = mutableListOf<GameSummary>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            list.add(
                GameSummary(
                    id = o.getInt("id"),
                    title = o.getString("title"),
                    platforms = o.optString("platforms", "PC"),
                    bestPriceCrc = if (o.isNull("best_price_crc")) null else o.getDouble("best_price_crc"),
                    bestStore = if (o.isNull("best_store")) null else o.getString("best_store"),
                    priceCount = o.optInt("price_count", 0),
                    rating = if (o.isNull("rating")) null else o.getDouble("rating"),
                    discountPct = if (o.isNull("discount_pct")) null else o.getDouble("discount_pct")
                )
            )
        }
        list
    } catch (_: Exception) {
        emptyList()
    }
}

suspend fun fetchGameDetail(baseUrl: String, gameId: Int): GameFullDetail? = withContext(Dispatchers.IO) {
    try {
        val url = URL("$baseUrl/games/$gameId")
        val conn = url.openConnection() as HttpURLConnection
        val body = conn.inputStream.bufferedReader().readText()
        val o = JSONObject(body)
        val pricesArr = o.getJSONArray("prices")
        val offers = mutableListOf<OfferDetail>()
        for (i in 0 until pricesArr.length()) {
            val p = pricesArr.getJSONObject(i)
            offers.add(
                OfferDetail(
                    store = p.getString("store"),
                    priceCrc = p.getDouble("price_crc"),
                    regularPriceCrc = if (p.isNull("regular_price_crc")) null else p.getDouble("regular_price_crc"),
                    url = if (p.isNull("url")) null else p.getString("url"),
                    format = p.optString("format", "Digital")
                )
            )
        }
        var mc: Int? = null
        val factsArr = o.getJSONArray("facts")
        for (i in 0 until factsArr.length()) {
            val f = factsArr.getJSONObject(i)
            if (f.optString("type") == "metacritic" || f.optString("source").lowercase().contains("metacritic")) {
                mc = f.optString("value").toIntOrNull()
            }
        }
        GameFullDetail(
            id = o.getInt("id"),
            title = o.getString("title"),
            platforms = o.optString("platforms", "PC"),
            metacritic = mc,
            offers = offers.sortedBy { it.priceCrc }
        )
    } catch (_: Exception) {
        null
    }
}
