/*
  BrainiLab Suggestions — Step 11 cloud adapter
*/
window.BrainiFeedback=(function(){
  function configured(){
    return !!window.BrainiBackendAuth?.isConfigured?.();
  }

  function client(){
    return window.BrainiBackendAuth?.getClient?.()||null;
  }

  async function submit(payload={}){
    if(!configured()){
      throw new Error(
        "The suggestions service is temporarily unavailable. Please try again."
      );
    }

    const clientId=
      BrainiData.authState()?.anonymousPlayerId
      || "browser-"+Date.now().toString(36);

    const {data,error}=await client().rpc(
      "submit_brainilab_suggestion",
      {
        p_type:payload.type||"general",
        p_message:payload.message||"",
        p_email:payload.email||null,
        p_client_id:clientId
      }
    );

    if(error) throw error;
    if(data?.ok!==true || typeof data.suggestion_id!=="string" || !data.suggestion_id){
      throw new Error("Your message could not be confirmed. Please try again.");
    }
    return data;
  }

  return {configured,submit};
})();
