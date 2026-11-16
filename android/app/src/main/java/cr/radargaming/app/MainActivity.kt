package cr.radargaming.app

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private val Night=Color(0xFF080B14)
private val Violet=Color(0xFF9B7BFF)
private data class GameItem(val id:Int,val title:String,val platforms:String,val price:Double?,val store:String?,val url:String?)

class MainActivity:ComponentActivity(){ override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContent{RadarApp()}} }

private suspend fun api(path:String):String=withContext(Dispatchers.IO){
    val connection=URL(BuildConfig.API_BASE_URL+path).openConnection() as HttpURLConnection
    connection.requestMethod="GET";connection.connectTimeout=10000;connection.readTimeout=15000
    try { if(connection.responseCode !in 200..299) error("API respondió ${connection.responseCode}"); connection.inputStream.bufferedReader().use{it.readText()} }
    finally { connection.disconnect() }
}

@Composable fun RadarApp(){
 val scope= rememberCoroutineScope(); val context=LocalContext.current; var query by remember{mutableStateOf("")}; var tab by remember{mutableStateOf("Inicio")}; var games by remember{mutableStateOf<List<GameItem>>(emptyList())}; var loading by remember{mutableStateOf(false)}; var error by remember{mutableStateOf("")}; var selected by remember{mutableStateOf<GameItem?>(null)}; var detail by remember{mutableStateOf<JSONObject?>(null)}
 suspend fun load(){ loading=true;error="";try{val q=if(query.isBlank())"" else "?q="+java.net.URLEncoder.encode(query,"UTF-8");val json=JSONObject(api("games$q"));val arr=json.getJSONArray("items");games=(0 until arr.length()).map{val g=arr.getJSONObject(it);GameItem(g.getInt("id"),g.getString("title"),g.optString("platforms",""),if(g.isNull("best_price_crc"))null else g.getDouble("best_price_crc"),g.optString("best_store",null),g.optString("best_url",null))}}catch(e:Exception){error="No se pudo conectar con el servidor. Revisá la URL de la API y su estado."}finally{loading=false} }
 LaunchedEffect(Unit){load()}
 LaunchedEffect(selected?.id){detail=null; if(selected!=null){try{detail=JSONObject(api("games/${selected!!.id}"))}catch(_:Exception){detail=null}}}
 MaterialTheme(colorScheme=darkColorScheme(primary=Violet,background=Night)){
  Scaffold(containerColor=Night,bottomBar={NavigationBar(containerColor=Color(0xFF111827)){listOf("Inicio","Buscar","Ofertas").forEach{item->NavigationBarItem(selected=tab==item,onClick={tab=item},icon={},label={Text(item,fontSize=10.sp)})}}}){padding->
   LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal=20.dp)){
    item { Spacer(Modifier.height(22.dp));Text("RADAR GAMING",color=Violet,fontSize=22.sp,fontWeight=FontWeight.Black);Spacer(Modifier.height(28.dp));Text(when(tab){"Ofertas"->"Ofertas verificadas";"Favoritos"->"Favoritos";"Buscar"->"Buscá videojuegos";"Perfil"->"Radar Gaming";else->"Encontrá el juego. Pagá menos."},fontSize=28.sp,fontWeight=FontWeight.Bold,color=Color.White);Spacer(Modifier.height(12.dp));Text("Compará precios observados en colones costarricenses.",color=Color.LightGray);Spacer(Modifier.height(16.dp));OutlinedTextField(value=query,onValueChange={query=it},modifier=Modifier.fillMaxWidth(),label={Text("Buscar videojuegos")},singleLine=true);Spacer(Modifier.height(8.dp));Button(onClick={selected=null;scope.launch{load()}},modifier=Modifier.fillMaxWidth()){Text("Buscar / actualizar")};Spacer(Modifier.height(12.dp));if(loading)CircularProgressIndicator();if(error.isNotBlank())Text(error,color=Color(0xFFFF8A8A));if(selected!=null){Text(selected!!.title,color=Color.White,fontSize=22.sp,fontWeight=FontWeight.Bold);Text("Plataformas: ${selected!!.platforms}",color=Color.LightGray);Text(selected!!.price?.let{"Mejor precio: ₡${it.toLong()}"}?:"Sin precio verificado",color=Violet);if(detail==null)Text("Cargando detalle…",color=Color.LightGray) else {val prices=detail!!.optJSONArray("prices");Text("Precios registrados: ${prices?.length()?:0}",color=Color.White);if(prices!=null){for(i in 0 until prices.length()){val p=prices.getJSONObject(i);Text("${p.optString("store")}: ₡${p.optDouble("price_crc").toLong()} · ${p.optString("format")}",color=Color.LightGray)}}};if(selected!!.url!=null)Text("Abrir tienda original ↗",color=Violet,modifier=Modifier.clickable{context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(selected!!.url))) });Text("Volver al catálogo",color=Violet,modifier=Modifier.clickable{selected=null})} }
    items(games.filter { tab != "Ofertas" || it.price != null }){g->Card(colors=CardDefaults.cardColors(containerColor=Color(0xFF111827)),modifier=Modifier.fillMaxWidth().padding(vertical=6.dp).clickable{selected=g}){Column(Modifier.padding(16.dp)){Text(g.title,color=Color.White,fontWeight=FontWeight.Bold,fontSize=17.sp);Text(g.platforms,color=Violet,fontSize=11.sp);Text(g.price?.let{"₡${g.price.toLong()} · ${g.store?:"Tienda"}"}?:"Sin precio verificado",color=Color.LightGray);Text("Ver detalle",color=Violet,fontSize=12.sp)}}}
   }
  }
 }
}
