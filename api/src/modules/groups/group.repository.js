import supabase from "../../common/config/supabaseClient.js";

// Creates a group to be added in the database
export async function createGroupRepo({ name, description, ownerId, joinCode, color }) {
  const { data, error } = await supabase.from("Group").insert([{
    name,
    description,
    owner_id: ownerId,
    join_code: joinCode,
    color
  }]).select().single();
  if (error) {
    throw new Error("Error creating group: " + error.message);
  }
  return data;
  
}
export async function joinGroupRepo(userId,joinCode,groupId) {
  const { data, error } = await supabase.from("group_join_request").insert([{
    user_id: userId,
    // join_code: joinCode,
    group_id: groupId
  }]).select().single();
  if (error) {
    throw new Error("Error joining group: " + error.message);
  }
  return data;
}

export async function viewRequestsRepo(groupId,invStatus) {
  const { data, error } = await supabase
    .from("group_join_request")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", invStatus);
  if (error) {
    throw new Error("Error fetching join requests: " + error.message);
  }
  return data;
}


// Gets the data you want using an existing field in the table
export async function getDataByField(dataNeeded, field,value, tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select(dataNeeded)
    .eq(field, value)
    .single();
  if (error) {
      throw new Error(`${field} not found in ${tableName}`);
  }
  return data;
}
export async function getAllDataByField(dataNeeded, field,value, tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select(dataNeeded)
    .eq(field, value)
    
  if (error) {
    throw new Error(`${field} not found in ${tableName}`);

  }
  return data;
}

export async function getGroupById(groupId) {
  const { data, error } = await supabase
    .from("Group")
    .select("*")
    .eq("id", groupId)
    .single();
    if (error) {
        throw new Error("Group not found");
    }
    return data;
}


export async function getPendingReq(groupId, userId) {

  const { data: pendingRequest, error } = await supabase
    .from('group_join_request')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    console.error("Error fetching pending request:", error);
    throw error;
  }


  return pendingRequest; 
}

export async function changeRequestStatus(requestId, newStatus) {
  const { data, error } = await supabase
    .from('group_join_request')
    .update({ status: newStatus })
    .eq('id', requestId)
    .select()
    .single();
  if (error) {
    console.error("Error updating request status:", error);
    throw error;
  }
  return data;
}

export async function addToGroupMembersRepo(user_id, group_id,role,) {
  const { data, error } = await supabase.from("group_members").insert([{
    user_id,
    group_id, 
    role
  }]).select().single();
  if (error) {
    throw new Error("Error adding member to group: " + error.message);
  } 
  return data;
}


export async function updateGroupRepo(id, { name, description, color }) {
  const { data, error } = await supabase
    .from("Group")
    .update({ name, description, color })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error("Error updating group: " + error.message);
  }

  return data;
}

export async function deleteGroupRepo(id) {
  const { data, error } = await supabase
    .from("Group")
    .update({ is_active: false }) 
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error("Error deleting group: " + error.message);
  }

  return data;
}




// select dataNeeded = joinCode where joinColumn = id from tableName
export async function getAllDataBy(dataNeed, value,tableName) {
  //   const { data, error } = await supabase
  //     .from(tableName)
  //     .select(dataNeed)
  //     .eq(dataNeed, value);
  // console.log("Supabase Select Response2:", { data, error });
  // if (error) {
  //     throw new Error("Group not found");
  // }
  // return data;
}