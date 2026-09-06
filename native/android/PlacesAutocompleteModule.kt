package com.anonymous.RoutineOs

import android.content.pm.PackageManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ActivityEventListener
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.model.AutocompleteSessionToken
import com.google.android.gms.maps.model.LatLng
import com.google.android.libraries.places.api.model.RectangularBounds
import com.google.android.libraries.places.api.net.FetchPlaceRequest
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.android.libraries.places.api.net.PlacesClient
import com.google.android.libraries.places.widget.Autocomplete
import com.google.android.libraries.places.widget.AutocompleteActivity
import com.google.android.libraries.places.widget.model.AutocompleteActivityMode

class PlacesAutocompleteModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ActivityEventListener {
  private var pendingPromise: Promise? = null
  private val requestCode = 7412
  private var placesClient: PlacesClient? = null
  private var sessionToken: AutocompleteSessionToken? = null

  init {
    context.addActivityEventListener(this)
  }

  override fun getName(): String = "RoutinePlacesAutocomplete"

  @ReactMethod
  fun getDeviceId(promise: Promise) {
    val androidId = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ANDROID_ID,
    )
    if (androidId.isNullOrBlank()) {
      promise.reject("NO_DEVICE_ID", "Android did not provide a stable device identifier.")
      return
    }
    promise.resolve("android:$androidId")
  }

  @ReactMethod
  fun open(initialQuery: String?, promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No foreground activity is available.")
      return
    }

    if (pendingPromise != null) {
      promise.reject("ALREADY_OPEN", "Places search is already open.")
      return
    }

    val metadata = context.packageManager.getApplicationInfo(
      context.packageName,
      PackageManager.GET_META_DATA,
    ).metaData
    val apiKey = metadata?.getString("com.google.android.libraries.places.API_KEY")
    if (apiKey.isNullOrBlank()) {
      promise.reject("NO_API_KEY", "The Places API key is missing from the Android manifest.")
      return
    }

    if (!Places.isInitialized()) {
      Places.initializeWithNewPlacesApiEnabled(context, apiKey)
    }
    placesClient = Places.createClient(context)

    val fields = listOf(
      Place.Field.ID,
      Place.Field.NAME,
      Place.Field.ADDRESS,
      Place.Field.LAT_LNG,
    )
    val builder = Autocomplete.IntentBuilder(AutocompleteActivityMode.OVERLAY, fields)
      .setCountries(listOf("IN"))
    if (!initialQuery.isNullOrBlank()) builder.setInitialQuery(initialQuery)
    val intent = builder.build(activity)
    pendingPromise = promise
    activity.startActivityForResult(intent, requestCode)
  }

  private fun client(promise: Promise): PlacesClient? {
    if (placesClient == null) initializePlaces(promise)
    return placesClient
  }

  private fun initializePlaces(promise: Promise) {
    val metadata = context.packageManager.getApplicationInfo(
      context.packageName,
      PackageManager.GET_META_DATA,
    ).metaData
    val apiKey = metadata?.getString("com.google.android.libraries.places.API_KEY")
    if (apiKey.isNullOrBlank()) {
      promise.reject("NO_API_KEY", "The Places API key is missing from the Android manifest.")
      return
    }
    if (!Places.isInitialized()) Places.initializeWithNewPlacesApiEnabled(context, apiKey)
    placesClient = Places.createClient(context)
  }

  @ReactMethod
  fun search(query: String, latitude: Double?, longitude: Double?, promise: Promise) {
    val places = client(promise) ?: return
    if (query.trim().length < 2) {
      promise.resolve(Arguments.createArray())
      return
    }
    val token = AutocompleteSessionToken.newInstance()
    sessionToken = token
    val requestBuilder = FindAutocompletePredictionsRequest.builder()
      .setQuery(query.trim())
      .setCountries(listOf("IN"))
      .setSessionToken(token)
    if (latitude != null && longitude != null) {
      val delta = 0.2
      requestBuilder.setLocationBias(
        RectangularBounds.newInstance(
          LatLng(latitude - delta, longitude - delta),
          LatLng(latitude + delta, longitude + delta),
        ),
      )
    }
    val request = requestBuilder.build()
    places.findAutocompletePredictions(request)
      .addOnSuccessListener { response ->
        val results = Arguments.createArray()
        response.autocompletePredictions.forEach { prediction ->
          results.pushMap(Arguments.createMap().apply {
            putString("id", prediction.placeId)
            putString("primaryText", prediction.getPrimaryText(null).toString())
            putString("secondaryText", prediction.getSecondaryText(null).toString())
            putString("description", prediction.getFullText(null).toString())
          })
        }
        promise.resolve(results)
      }
      .addOnFailureListener { error -> promise.reject("PLACES_ERROR", error.message, error) }
  }

  @ReactMethod
  fun select(placeId: String, promise: Promise) {
    val places = client(promise) ?: return
    val fields = listOf(Place.Field.ID, Place.Field.NAME, Place.Field.ADDRESS, Place.Field.LAT_LNG)
    val requestBuilder = FetchPlaceRequest.builder(placeId, fields)
    sessionToken?.let { token -> requestBuilder.setSessionToken(token) }
    val request = requestBuilder.build()
    places.fetchPlace(request)
      .addOnSuccessListener { response ->
        val place = response.place
        val coordinates = place.latLng
        if (coordinates == null) {
          promise.reject("NO_LOCATION", "Google did not return a location for this place.")
          return@addOnSuccessListener
        }
        promise.resolve(Arguments.createMap().apply {
          putString("id", place.id)
          putString("name", place.name)
          putString("address", place.address)
          putDouble("latitude", coordinates.latitude)
          putDouble("longitude", coordinates.longitude)
        })
        sessionToken = null
      }
      .addOnFailureListener { error -> promise.reject("PLACES_ERROR", error.message, error) }
  }
  override fun onActivityResult(activity: android.app.Activity?, requestCode: Int, resultCode: Int, data: android.content.Intent?) {
    handleActivityResult(requestCode, resultCode, data)
  }

  override fun onNewIntent(intent: android.content.Intent?) = Unit

  fun handleActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?): Boolean {
    if (requestCode != this.requestCode) return false
    val promise = pendingPromise ?: return true
    pendingPromise = null

    when (resultCode) {
      AutocompleteActivity.RESULT_OK -> {
        val place = data?.let { Autocomplete.getPlaceFromIntent(it) }
        val coordinates = place?.latLng
        if (place == null || coordinates == null) {
          promise.reject("NO_LOCATION", "Google did not return a location for this place.")
          return true
        }
        val result = Arguments.createMap().apply {
          putString("id", place.id)
          putString("name", place.name)
          putString("address", place.address)
          putDouble("latitude", coordinates.latitude)
          putDouble("longitude", coordinates.longitude)
        }
        promise.resolve(result)
      }
      AutocompleteActivity.RESULT_ERROR -> {
        val error = data?.let { Autocomplete.getStatusFromIntent(it) }
        promise.reject("PLACES_ERROR", error?.statusMessage ?: "Google Places search failed.")
      }
      else -> promise.reject("CANCELLED", "Places search was cancelled.")
    }
    return true
  }
}
